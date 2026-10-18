package com.app.invoice_bee.repositories;

import com.app.invoice_bee.entities.ProductIdentifier;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ProductIdentifierRepository extends JpaRepository<ProductIdentifier, UUID> {
    List<ProductIdentifier> findByProductId(UUID productId);
    List<ProductIdentifier> findByShopIdAndIdentifierValue(UUID shopId, String identifierValue);
}
