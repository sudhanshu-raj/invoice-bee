package com.app.invoice_bee.dtos;

import java.time.LocalDate;

public record CreateCustomerEnquiryRequest(
        String customerName,
        String phone,
        String productsInterested,
        String expectedVisitDate,
        LocalDate nextFollowUpDate,
        String notes
) {
}
