package com.app.invoice_bee.repositories;

import com.app.invoice_bee.entities.ItemDescription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ItemDescriptionRepository extends JpaRepository<ItemDescription, UUID> {
    Optional<ItemDescription> findTopByProductIdOrderByCreatedAtDesc(UUID productId);
    Optional<ItemDescription> findByRawHash(String rawHash);
    List<ItemDescription> findByProductId(UUID productId);
}
