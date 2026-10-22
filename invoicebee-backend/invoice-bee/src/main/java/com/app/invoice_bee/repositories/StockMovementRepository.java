package com.app.invoice_bee.repositories;

import com.app.invoice_bee.entities.StockMovement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface StockMovementRepository extends JpaRepository<StockMovement, UUID> {
    List<StockMovement> findByShopIdAndProductId(UUID shopId, UUID productId);

    @Modifying
    @Query("DELETE FROM StockMovement s WHERE s.product.id IN :productIds")
    void deleteByProductIds(@Param("productIds") List<UUID> productIds);

    @Modifying
    @Query("DELETE FROM StockMovement s WHERE s.invoice.id = :invoiceId")
    void deleteByInvoiceId(@Param("invoiceId") UUID invoiceId);
}
