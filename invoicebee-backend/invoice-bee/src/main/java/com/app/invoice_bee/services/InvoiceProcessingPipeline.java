package com.app.invoice_bee.services;

import jakarta.annotation.PreDestroy;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

@Service
public class InvoiceProcessingPipeline {

    private final BlockingQueue<UUID> queue = new LinkedBlockingQueue<>(500);
    private final ExecutorService workerPool = Executors.newFixedThreadPool(3);
    private final InvoiceJobExecutionService executionService;

    public InvoiceProcessingPipeline(InvoiceJobExecutionService executionService) {
        this.executionService = executionService;
        for (int i = 0; i < 3; i++) {
            workerPool.submit(this::processQueue);
        }
    }

    public void submitJob(UUID jobId) {
        if (!queue.offer(jobId)) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Queue full, try again");
        }
    }

    private void processQueue() {
        while (!Thread.currentThread().isInterrupted()) {
            try {
                UUID jobId = queue.take();
                executionService.executeJob(jobId);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            }
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
