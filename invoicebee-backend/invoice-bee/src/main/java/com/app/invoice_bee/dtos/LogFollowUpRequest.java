package com.app.invoice_bee.dtos;

import com.app.invoice_bee.entities.EnquiryStatus;
import java.time.LocalDate;

public record LogFollowUpRequest(
        LocalDate nextFollowUpDate,
        String callNote,
        EnquiryStatus status
) {
}
