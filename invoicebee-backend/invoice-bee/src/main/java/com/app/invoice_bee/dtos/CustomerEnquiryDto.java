package com.app.invoice_bee.dtos;

import com.app.invoice_bee.entities.EnquiryStatus;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

public record CustomerEnquiryDto(
        UUID id,
        UUID shopId,
        String customerName,
        String phone,
        String productsInterested,
        String expectedVisitDate,
        EnquiryStatus status,
        int followUpCount,
        LocalDate nextFollowUpDate,
        OffsetDateTime lastFollowedUpAt,
        String followUpNotes,
        String notes,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}
