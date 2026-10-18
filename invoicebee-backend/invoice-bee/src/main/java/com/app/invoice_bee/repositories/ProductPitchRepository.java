package com.app.invoice_bee.repositories;

import com.app.invoice_bee.entities.ProductPitch;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ProductPitchRepository extends JpaRepository<ProductPitch, UUID> {
    List<ProductPitch> findByProductId(UUID productId);
}
