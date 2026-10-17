package com.app.invoice_bee.entities;

import java.math.BigDecimal;
import java.util.List;

public record InvoiceData(
        String invoiceNumber,
        String invoiceDate,
        String sellerName,
        String sellerGstin,
        String buyerName,
        String buyerGstin,
        String paymentMode,
        List<LineItem> items,
        BigDecimal totalTaxAmount,
        BigDecimal subTotal,
        BigDecimal grandTotal
) {
    public record LineItem(
            int serialNo,
            String itemName,
            String hsnSac,
            int quantity,
            String unit,
            BigDecimal pricePerUnit,
            BigDecimal gstAmount,
            int gstPercentage,
            BigDecimal totalAmount
    ) {}
}