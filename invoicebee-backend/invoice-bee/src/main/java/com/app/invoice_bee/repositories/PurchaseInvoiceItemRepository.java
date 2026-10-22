package com.app.invoice_bee.repositories;

import com.app.invoice_bee.entities.PurchaseInvoiceItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PurchaseInvoiceItemRepository extends JpaRepository<PurchaseInvoiceItem, UUID> {
    List<PurchaseInvoiceItem> findByInvoiceId(UUID invoiceId);

    @Modifying
    @Query("UPDATE PurchaseInvoiceItem p SET p.product = NULL WHERE p.product.id IN :productIds")
    void clearProductReferenceForProductIds(@Param("productIds") List<UUID> productIds);

    @Modifying
    @Query("DELETE FROM PurchaseInvoiceItem p WHERE p.invoice.id = :invoiceId")
    void deleteByInvoiceId(@Param("invoiceId") UUID invoiceId);
}
