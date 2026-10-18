package com.app.invoice_bee.repositories;

import com.app.invoice_bee.entities.PurchaseInvoice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PurchaseInvoiceRepository extends JpaRepository<PurchaseInvoice, UUID> {
    Optional<PurchaseInvoice> findByShopIdAndId(UUID shopId, UUID id);
    Optional<PurchaseInvoice> findByShopIdAndSupplierIdAndInvoiceNumber(UUID shopId, UUID supplierId, String invoiceNumber);
    List<PurchaseInvoice> findByShopIdOrderByInvoiceDateDesc(UUID shopId);
    List<PurchaseInvoice> findByShopIdAndSupplierId(UUID shopId, UUID supplierId);
}
