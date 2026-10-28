package com.app.invoice_bee.dtos;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record ProductDetailDto(
        UUID id,
        String name,
        String sku,
        String category,
        String unit,
        String brand,
        String model,
        BigDecimal sellingPrice,
        BigDecimal discountPrice,
        BigDecimal mrp,
        BigDecimal buyingPrice,
        BigDecimal lastPurchaseCost,
        BigDecimal stock,
        UUID qrToken,
        String hsnSac,
        String pitchHook,
        OffsetDateTime updatedAt,
        String intelligenceStatus,
        String intelligencePitch,
        String intelligenceDescription,
        String intelligenceSpecifications,
        String sourceUrl,
        String sourceUrls
) {
}
