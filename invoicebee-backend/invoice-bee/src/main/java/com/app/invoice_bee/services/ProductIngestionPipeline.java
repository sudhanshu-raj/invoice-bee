package com.app.invoice_bee.services;

import com.app.invoice_bee.dtos.ProductIngestionResultDto;
import com.app.invoice_bee.entities.Product;
import com.app.invoice_bee.entities.ProductIngestionJob;
import com.app.invoice_bee.repositories.ItemDescriptionRepository;
import com.app.invoice_bee.repositories.ProductIngestionJobRepository;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.annotation.Lazy;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

@Service
public class ProductIngestionPipeline {

    private static final Logger log = LoggerFactory.getLogger(ProductIngestionPipeline.class);

    private final BlockingQueue<UUID> queue = new LinkedBlockingQueue<>(1000);
    private final Set<UUID> queuedOrRunning = ConcurrentHashMap.newKeySet();
    private final ExecutorService workerPool = Executors.newFixedThreadPool(2);
    private final ProductIngestionJobRepository jobRepository;
    private final ItemDescriptionRepository itemDescriptionRepository;
    private final ProductIntelligenceService intelligenceService;

    public ProductIngestionPipeline(
            ProductIngestionJobRepository jobRepository,
            ItemDescriptionRepository itemDescriptionRepository,
            @Lazy ProductIntelligenceService intelligenceService
    ) {
        this.jobRepository = jobRepository;
        this.itemDescriptionRepository = itemDescriptionRepository;
        this.intelligenceService = intelligenceService;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void onApplicationReady() {
        for (int i = 0; i < 2; i++) {
            workerPool.submit(this::processQueue);
        }
        recoverPendingJobs();
    }

    @Scheduled(fixedDelay = 60000, initialDelay = 60000)
    public void scheduledPendingJobCheck() {
        try {
            List<ProductIngestionJob> pendingJobs = jobRepository.findByStatus(ProductIngestionJob.JobStatus.PENDING);
            int recoveredCount = 0;
            for (ProductIngestionJob job : pendingJobs) {
                if (enqueueIfAbsent(job.getId())) {
                    recoveredCount++;
                }
            }
            if (recoveredCount > 0) {
                log.info("Scheduled checker queued {} pending product ingestion job(s)", recoveredCount);
            }
        } catch (Exception ex) {
            log.warn("Scheduled pending job check encountered an error: {}", ex.getMessage());
        }
    }

    public int recoverPendingJobs() {
        int recoveredCount = 0;
        try {
            List<ProductIngestionJob> inProgressJobs = jobRepository.findByStatus(ProductIngestionJob.JobStatus.IN_PROGRESS);
            for (ProductIngestionJob j : inProgressJobs) {
                j.setStatus(ProductIngestionJob.JobStatus.PENDING);
                j.setUpdatedAt(OffsetDateTime.now());
                jobRepository.save(j);
                if (enqueueIfAbsent(j.getId())) {
                    recoveredCount++;
                }
            }
            List<ProductIngestionJob> pendingJobs = jobRepository.findByStatus(ProductIngestionJob.JobStatus.PENDING);
            for (ProductIngestionJob j : pendingJobs) {
                if (enqueueIfAbsent(j.getId())) {
                    recoveredCount++;
                }
            }
            if (recoveredCount > 0) {
                log.info("Recovered and queued {} pending/interrupted product ingestion job(s) on startup", recoveredCount);
            }
        } catch (Exception ex) {
            log.warn("Could not recover pending ingestion jobs: {}", ex.getMessage());
        }
        return recoveredCount;
    }

    private boolean enqueueIfAbsent(UUID jobId) {
        if (jobId == null) {
            return false;
        }
        if (queuedOrRunning.add(jobId)) {
            if (!queue.offer(jobId)) {
                queuedOrRunning.remove(jobId);
                return false;
            }
            return true;
        }
        return false;
    }

    public Optional<ProductIngestionJob> queueProductIngestion(Product product, UUID shopId) {
        if (product == null || product.getId() == null) {
            return Optional.empty();
        }

        if (itemDescriptionRepository.findTopByProductIdOrderByCreatedAtDesc(product.getId()).isPresent()) {
            return Optional.empty();
        }

        Optional<ProductIngestionJob> existingActive = jobRepository.findActiveJobByProductId(product.getId());
        if (existingActive.isPresent()) {
            ProductIngestionJob existingJob = existingActive.get();
            if (existingJob.getStatus() == ProductIngestionJob.JobStatus.PENDING) {
                enqueueIfAbsent(existingJob.getId());
            }
            return Optional.of(existingJob);
        }

        ProductIngestionJob job = new ProductIngestionJob();
        job.setProduct(product);
        job.setShopId(shopId);
        job.setProductName(product.getName());
        job.setStatus(ProductIngestionJob.JobStatus.PENDING);
        job.setCreatedAt(OffsetDateTime.now());
        job.setUpdatedAt(OffsetDateTime.now());

        ProductIngestionJob saved = jobRepository.saveAndFlush(job);
        UUID savedJobId = saved.getId();
        if (TransactionSynchronizationManager.isActualTransactionActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    enqueueIfAbsent(savedJobId);
                }
            });
        } else {
            enqueueIfAbsent(savedJobId);
        }
        return Optional.of(saved);
    }

    private void processQueue() {
        while (!Thread.currentThread().isInterrupted()) {
            try {
                UUID jobId = queue.take();
                try {
                    executeJob(jobId);
                } finally {
                    queuedOrRunning.remove(jobId);
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            } catch (Exception ex) {
                log.error("Unhandled error processing ingestion job queue: {}", ex.getMessage(), ex);
            }
        }
    }

    private void executeJob(UUID jobId) {
        ProductIngestionJob job = jobRepository.findByIdWithProduct(jobId).orElse(null);
        if (job == null) {
            return;
        }

        Product product = job.getProduct();
        UUID productId = product != null ? product.getId() : null;

        try {
            job.setStatus(ProductIngestionJob.JobStatus.IN_PROGRESS);
            job.setUpdatedAt(OffsetDateTime.now());
            jobRepository.save(job);

            String brand = product.getBrand();
            String model = product.getModel();
            String name = product.getName();
            String query = ((brand != null ? brand + " " : "") + name + (model != null && !model.isBlank() ? " " + model : "")).trim();

            ProductIngestionResultDto result = intelligenceService.ingestProductIntelligence(productId, query);

            if ("SUCCESS".equalsIgnoreCase(result.status())) {
                job.setStatus(ProductIngestionJob.JobStatus.COMPLETED);
                job.setErrorMessage(null);
            } else {
                job.setStatus(ProductIngestionJob.JobStatus.FAILED);
                job.setErrorMessage("Ingestion resulted in status: " + result.status());
            }
        } catch (Exception ex) {
            log.error("Ingestion job failed for product {}: {}", productId, ex.getMessage(), ex);
            job.setStatus(ProductIngestionJob.JobStatus.FAILED);
            job.setErrorMessage(ex.getMessage());
        } finally {
            job.setUpdatedAt(OffsetDateTime.now());
            jobRepository.save(job);
        }
    }

    @PreDestroy
    public void shutdown() {
        workerPool.shutdown();
        try {
            if (!workerPool.awaitTermination(5, TimeUnit.SECONDS)) {
                workerPool.shutdownNow();
            }
        } catch (InterruptedException e) {
            workerPool.shutdownNow();
            Thread.currentThread().interrupt();
        }
    }
}
