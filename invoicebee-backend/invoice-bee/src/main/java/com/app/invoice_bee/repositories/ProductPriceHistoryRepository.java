package com.app.invoice_bee.repositories;

import com.app.invoice_bee.entities.ProductPriceHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ProductPriceHistoryRepository extends JpaRepository<ProductPriceHistory, UUID> {
    List<ProductPriceHistory> findByProductIdOrderByChangedAtDesc(UUID productId);
}
