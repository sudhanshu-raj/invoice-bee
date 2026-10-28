package com.app.invoice_bee.services;

import jakarta.annotation.PreDestroy;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

@Service
public class InvoiceProcessingPipeline {

    private final ExecutorService workerPool = Executors.newFixedThreadPool(3);
    private final InvoiceJobExecutionService executionService;
    private final Map<UUID, Future<?>> activeFutures = new ConcurrentHashMap<>();
    private final Set<UUID> cancelledJobs = ConcurrentHashMap.newKeySet();

    public InvoiceProcessingPipeline(InvoiceJobExecutionService executionService) {
        this.executionService = executionService;
    }

    public void submitJob(UUID jobId) {
        cancelledJobs.remove(jobId);
        Future<?> future = workerPool.submit(() -> {
            try {
                if (cancelledJobs.contains(jobId) || Thread.currentThread().isInterrupted()) {
                    return;
                }
                executionService.executeJob(jobId, () -> cancelledJobs.contains(jobId) || Thread.currentThread().isInterrupted());
            } finally {
                activeFutures.remove(jobId);
            }
        });
        activeFutures.put(jobId, future);
    }

    public boolean cancelJob(UUID jobId) {
        cancelledJobs.add(jobId);
        Future<?> future = activeFutures.remove(jobId);
        if (future != null) {
            return future.cancel(true);
        }
        return false;
    }

    public boolean isCancelled(UUID jobId) {
        return cancelledJobs.contains(jobId);
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
