package com.app.invoice_bee.dtos;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record SupplierDto(
        UUID id,
        String name,
        String phone,
        String gstin,
        int invoicesCount,
        BigDecimal totalSpend,
        OffsetDateTime createdAt
) {
}
