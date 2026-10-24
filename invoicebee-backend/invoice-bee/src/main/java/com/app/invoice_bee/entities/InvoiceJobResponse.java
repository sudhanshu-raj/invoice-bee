package com.app.invoice_bee.entities;

import com.app.invoice_bee.dtos.InvoiceScanResponse;

import java.util.UUID;

public record InvoiceJobResponse(
        UUID jobId,
        InvoiceJobStatus status,
        InvoiceScanResponse result
) {
    
}
