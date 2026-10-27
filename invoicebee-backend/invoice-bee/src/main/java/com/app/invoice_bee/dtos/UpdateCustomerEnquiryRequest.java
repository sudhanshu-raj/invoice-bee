package com.app.invoice_bee.dtos;

import com.app.invoice_bee.entities.EnquiryStatus;
import java.time.LocalDate;

public record UpdateCustomerEnquiryRequest(
        String customerName,
        String phone,
        String productsInterested,
        String expectedVisitDate,
        EnquiryStatus status,
        Integer followUpCount,
        LocalDate nextFollowUpDate,
        String followUpNotes,
        String notes
) {
}
