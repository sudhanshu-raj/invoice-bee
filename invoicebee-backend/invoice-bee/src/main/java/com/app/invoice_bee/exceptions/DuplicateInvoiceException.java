package com.app.invoice_bee.exceptions;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public class DuplicateInvoiceException extends RuntimeException {

    private final UUID existingInvoiceId;
    private final String invoiceNumber;
    private final String supplierName;
    private final LocalDate invoiceDate;
    private final BigDecimal totalAmount;

    public DuplicateInvoiceException(UUID existingInvoiceId, String invoiceNumber, String supplierName, LocalDate invoiceDate, BigDecimal totalAmount) {
        super("Invoice with number '" + invoiceNumber + "' already exists for this supplier.");
        this.existingInvoiceId = existingInvoiceId;
        this.invoiceNumber = invoiceNumber;
        this.supplierName = supplierName;
        this.invoiceDate = invoiceDate;
        this.totalAmount = totalAmount;
    }

    public UUID getExistingInvoiceId() {
        return existingInvoiceId;
    }

    public String getInvoiceNumber() {
        return invoiceNumber;
    }

    public String getSupplierName() {
        return supplierName;
    }

    public LocalDate getInvoiceDate() {
        return invoiceDate;
    }

    public BigDecimal getTotalAmount() {
        return totalAmount;
    }
}
