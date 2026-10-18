package com.app.invoice_bee.dtos;

import com.app.invoice_bee.entities.InvoiceData;

import java.util.List;

public record InvoiceScanResponse(
        InvoiceData invoiceData,
        List<ProductMatchDto> availableProducts,
        String sourceFileUrl
) {
}
