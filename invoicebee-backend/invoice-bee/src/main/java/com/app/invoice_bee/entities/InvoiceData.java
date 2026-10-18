package com.app.invoice_bee.entities;

import com.fasterxml.jackson.annotation.JsonAlias;
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
        @JsonAlias({"grandTotal", "total_amount", "grand_total", "finalAmount", "netPayable"})
        BigDecimal totalAmount,
        @JsonAlias({"totalAmount", "total_amount", "grand_total", "finalAmount", "netPayable"})
        BigDecimal grandTotal
) {
    public InvoiceData(
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
            BigDecimal totalAmount
    ) {
        this(invoiceNumber, invoiceDate, sellerName, sellerGstin, buyerName, buyerGstin, paymentMode, items, totalTaxAmount, subTotal, totalAmount, totalAmount);
    }

    public record LineItem(
            int serialNo,
            String itemName,
            String hsnSac,
            int quantity,
            String unit,
            BigDecimal pricePerUnit,
            BigDecimal discountPercentage,
            BigDecimal discountAmount,
            BigDecimal gstAmount,
            int gstPercentage,
            @JsonAlias({"lineTotal", "amount", "total", "line_total"})
            BigDecimal totalAmount,
            BigDecimal confidenceScore
    ) {}
}