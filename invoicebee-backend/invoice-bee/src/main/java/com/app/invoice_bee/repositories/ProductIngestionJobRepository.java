package com.app.invoice_bee.repositories;

import com.app.invoice_bee.entities.ProductIngestionJob;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ProductIngestionJobRepository extends JpaRepository<ProductIngestionJob, UUID> {
    Optional<ProductIngestionJob> findTopByProductIdOrderByCreatedAtDesc(UUID productId);
    List<ProductIngestionJob> findByStatus(ProductIngestionJob.JobStatus status);
    List<ProductIngestionJob> findByShopIdAndStatus(UUID shopId, ProductIngestionJob.JobStatus status);

    @Query("SELECT j FROM ProductIngestionJob j JOIN FETCH j.product WHERE j.id = :id")
    Optional<ProductIngestionJob> findByIdWithProduct(@Param("id") UUID id);

    @Query("SELECT j FROM ProductIngestionJob j WHERE j.product.id IN :productIds")
    List<ProductIngestionJob> findByProductIds(@Param("productIds") List<UUID> productIds);

    Optional<ProductIngestionJob> findTopByProductIdAndStatusInOrderByCreatedAtDesc(UUID productId, List<ProductIngestionJob.JobStatus> statuses);

    default Optional<ProductIngestionJob> findActiveJobByProductId(UUID productId) {
        return findTopByProductIdAndStatusInOrderByCreatedAtDesc(productId, List.of(ProductIngestionJob.JobStatus.PENDING, ProductIngestionJob.JobStatus.IN_PROGRESS));
    }
}
