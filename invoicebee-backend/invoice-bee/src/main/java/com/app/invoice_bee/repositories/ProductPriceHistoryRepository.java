package com.app.invoice_bee.repositories;

import com.app.invoice_bee.entities.ProductPriceHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ProductPriceHistoryRepository extends JpaRepository<ProductPriceHistory, UUID> {
    List<ProductPriceHistory> findByProductIdOrderByChangedAtDesc(UUID productId);

    @Modifying
    @Query("DELETE FROM ProductPriceHistory p WHERE p.product.id IN :productIds")
    void deleteByProductIds(@Param("productIds") List<UUID> productIds);
}
