package com.app.invoice_bee.repositories;

import com.app.invoice_bee.entities.ProductCostHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ProductCostHistoryRepository extends JpaRepository<ProductCostHistory, UUID> {
    List<ProductCostHistory> findByProductIdOrderByRecordedAtDesc(UUID productId);

    @Modifying
    @Query("DELETE FROM ProductCostHistory p WHERE p.product.id IN :productIds")
    void deleteByProductIds(@Param("productIds") List<UUID> productIds);

    @Modifying
    @Query("DELETE FROM ProductCostHistory p WHERE p.invoiceItem.id IN :itemIds")
    void deleteByInvoiceItemIds(@Param("itemIds") List<UUID> itemIds);
}
