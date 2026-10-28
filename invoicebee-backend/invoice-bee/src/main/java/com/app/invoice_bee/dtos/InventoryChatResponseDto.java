package com.app.invoice_bee.dtos;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record InventoryChatResponseDto(
        String answer,
        String modelUsed,
        int totalProducts,
        int lowStockCount,
        int outOfStockCount,
        BigDecimal totalInventoryValuation,
        List<MatchedProductContext> matchedProducts
) {
    public record MatchedProductContext(
            UUID id,
            String name,
            String sku,
            String category,
            BigDecimal stock,
            String unit,
            BigDecimal buyingPrice,
            BigDecimal sellingPrice,
            BigDecimal mrp,
            BigDecimal marginPercent,
            String shortPitch
    ) {}
}

