package com.app.invoice_bee.dtos;

import java.math.BigDecimal;
import java.util.List;

public record ProductWebIntelligenceDto(
        String query,
        String suggestedName,
        String brand,
        String category,
        BigDecimal estimatedMrp,
        String hsnCode,
        String description,
        String salesPitch,
        List<SearchResultItem> sources
) {
    public record SearchResultItem(
            String title,
            String url,
            String snippet
    ) {}
}
