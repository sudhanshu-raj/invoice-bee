package com.app.invoice_bee.repositories;

import com.app.invoice_bee.entities.PurchaseInvoiceItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PurchaseInvoiceItemRepository extends JpaRepository<PurchaseInvoiceItem, UUID> {
    List<PurchaseInvoiceItem> findByInvoiceId(UUID invoiceId);
}
