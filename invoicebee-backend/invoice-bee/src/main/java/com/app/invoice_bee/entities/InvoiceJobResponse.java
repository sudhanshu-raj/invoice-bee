package com.app.invoice_bee.entities;

import com.app.invoice_bee.dtos.InvoiceScanResponse;

import java.time.LocalDateTime;
import java.util.UUID;

public record InvoiceJobResponse(
        UUID jobId,
        InvoiceJobStatus status,
        InvoiceScanResponse result,
        String originalFileName,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public InvoiceJobResponse(UUID jobId, InvoiceJobStatus status, InvoiceScanResponse result) {
        this(jobId, status, result, null, null, null);
    }
}
