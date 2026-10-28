package com.app.invoice_bee.repositories;

import com.app.invoice_bee.entities.ItemEmbedding;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ItemEmbeddingRepository extends JpaRepository<ItemEmbedding, Long>, ItemEmbeddingCustomRepository {
    List<ItemEmbedding> findByProductId(UUID productId);
    void deleteByProductId(UUID productId);
}
