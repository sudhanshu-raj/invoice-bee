package com.app.invoice_bee.repositories;

import com.app.invoice_bee.entities.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ProductRepository extends JpaRepository<Product, UUID> {
    Optional<Product> findByShopIdAndSku(UUID shopId, String sku);
    Optional<Product> findByShopIdAndNameIgnoreCase(UUID shopId, String name);
    List<Product> findByShopId(UUID shopId);
    Optional<Product> findByQrToken(UUID qrToken);
    Optional<Product> findByShopIdAndQrToken(UUID shopId, UUID qrToken);

    @Modifying
    @Query("DELETE FROM Product p WHERE p.id IN :productIds AND p.shop.id = :shopId")
    int deleteByIdsAndShopId(@Param("productIds") List<UUID> productIds, @Param("shopId") UUID shopId);
}
