package com.app.invoice_bee.dtos;

import java.math.BigDecimal;
import java.util.UUID;

public record ProductSearchMatchDto(
        UUID productId,
        String productName,
        String brand,
        String category,
        BigDecimal price,
        String chunkType,
        String matchedChunk,
        String shortPitch,
        String fullDescription,
        String specifications,
        Double similarityScore
) {}
