package com.app.invoice_bee.dtos;

import java.math.BigDecimal;
import java.util.UUID;

public record PurchaseInvoiceItemDto(
        UUID id,
        UUID productId,
        String productName,
        String sku,
        String description,
        BigDecimal quantity,
        BigDecimal unitCost,
        BigDecimal discountAmount,
        BigDecimal taxRate,
        BigDecimal taxAmount,
        BigDecimal lineTotal
) {
}
