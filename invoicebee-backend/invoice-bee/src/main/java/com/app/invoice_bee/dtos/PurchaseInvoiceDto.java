package com.app.invoice_bee.dtos;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

public record PurchaseInvoiceDto(
        UUID id,
        String invoiceNumber,
        LocalDate invoiceDate,
        String supplierName,
        BigDecimal totalAmount,
        String status,
        int itemsCount,
        OffsetDateTime createdAt,
        String sourceFileUrl
) {
}
