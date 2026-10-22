package com.app.invoice_bee.dtos;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record PurchaseInvoiceDetailDto(
        UUID id,
        String invoiceNumber,
        LocalDate invoiceDate,
        String supplierName,
        String supplierGstin,
        String supplierPhone,
        String paymentMode,
        BigDecimal subtotal,
        BigDecimal taxAmount,
        BigDecimal totalAmount,
        String status,
        String sourceFileUrl,
        OffsetDateTime createdAt,
        OffsetDateTime postedAt,
        List<PurchaseInvoiceItemDto> items
) {
}
