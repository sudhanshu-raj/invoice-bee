package com.app.invoice_bee.repositories;

import com.app.invoice_bee.entities.ProductPrice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ProductPriceRepository extends JpaRepository<ProductPrice, UUID> {
    Optional<ProductPrice> findByProductId(UUID productId);
}
