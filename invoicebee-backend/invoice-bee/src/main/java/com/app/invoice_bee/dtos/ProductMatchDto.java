package com.app.invoice_bee.dtos;

import java.math.BigDecimal;
import java.util.UUID;

public record ProductMatchDto(
        UUID id,
        String name,
        String sku,
        BigDecimal sellingPrice,
        BigDecimal mrp,
        BigDecimal lastPurchaseCost,
        BigDecimal stock,
        UUID qrToken
) {
    public ProductMatchDto(
            UUID id,
            String name,
            String sku,
            BigDecimal sellingPrice,
            BigDecimal mrp,
            BigDecimal lastPurchaseCost,
            BigDecimal stock
    ) {
        this(id, name, sku, sellingPrice, mrp, lastPurchaseCost, stock, null);
    }
}
