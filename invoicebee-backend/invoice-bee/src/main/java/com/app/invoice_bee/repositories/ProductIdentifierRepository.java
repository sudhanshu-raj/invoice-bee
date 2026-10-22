package com.app.invoice_bee.repositories;

import com.app.invoice_bee.entities.ProductIdentifier;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ProductIdentifierRepository extends JpaRepository<ProductIdentifier, UUID> {
    List<ProductIdentifier> findByProductId(UUID productId);
    List<ProductIdentifier> findByShopIdAndIdentifierValue(UUID shopId, String identifierValue);

    @Modifying
    @Query("DELETE FROM ProductIdentifier p WHERE p.product.id IN :productIds")
    void deleteByProductIds(@Param("productIds") List<UUID> productIds);
}
