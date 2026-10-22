package com.app.invoice_bee.repositories;

import com.app.invoice_bee.entities.ProductPrice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ProductPriceRepository extends JpaRepository<ProductPrice, UUID> {
    Optional<ProductPrice> findByProductId(UUID productId);

    @Modifying
    @Query("DELETE FROM ProductPrice p WHERE p.product.id IN :productIds")
    void deleteByProductIds(@Param("productIds") List<UUID> productIds);
}
