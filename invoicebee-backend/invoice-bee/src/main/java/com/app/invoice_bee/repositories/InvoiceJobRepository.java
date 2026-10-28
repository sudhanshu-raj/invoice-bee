package com.app.invoice_bee.repositories;

import com.app.invoice_bee.dtos.InvoiceScanResponse;
import com.app.invoice_bee.entities.InvoiceJobStatus;
import com.app.invoice_bee.entities.InvoiceJob;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface InvoiceJobRepository extends JpaRepository<InvoiceJob, UUID> {

    Optional<InvoiceJob> findByIdAndShopId(UUID id, UUID shopId);

    List<InvoiceJob> findByShopIdAndStatusNotInOrderByCreatedAtDesc(UUID shopId, Collection<InvoiceJobStatus> statuses);

    @Transactional
    @Modifying
    @Query("UPDATE InvoiceJob u SET u.status = :status, u.updatedAt = :updatedAt WHERE u.id = :id AND u.status <> com.app.invoice_bee.entities.InvoiceJobStatus.CANCELLED")
    int updateStatus(@Param("id") UUID id, @Param("status") InvoiceJobStatus status, @Param("updatedAt") LocalDateTime updatedAt);
    
    @Transactional
    @Modifying
    @Query("UPDATE InvoiceJob u SET u.result = :result, u.status = com.app.invoice_bee.entities.InvoiceJobStatus.COMPLETED, u.updatedAt = :updatedAt WHERE u.id = :id AND u.status <> com.app.invoice_bee.entities.InvoiceJobStatus.CANCELLED")
    int updateSuccess(@Param("id") UUID id, @Param("result") InvoiceScanResponse result, @Param("updatedAt") LocalDateTime updatedAt);
    
    @Transactional
    @Modifying
    @Query("UPDATE InvoiceJob u SET u.failureMessage = :failureMsg, u.status = com.app.invoice_bee.entities.InvoiceJobStatus.FAILED, u.updatedAt = :updatedAt WHERE u.id = :id AND u.status <> com.app.invoice_bee.entities.InvoiceJobStatus.CANCELLED")
    int updateFailure(@Param("id") UUID id, @Param("failureMsg") String failureMessage, @Param("updatedAt") LocalDateTime updatedAt);

    @Transactional
    @Modifying
    @Query("UPDATE InvoiceJob u SET u.failureMessage = :reason, u.status = com.app.invoice_bee.entities.InvoiceJobStatus.CANCELLED, u.updatedAt = :updatedAt WHERE u.id = :id")
    int updateCancelled(@Param("id") UUID id, @Param("reason") String reason, @Param("updatedAt") LocalDateTime updatedAt);

    @Transactional
    @Modifying
    @Query("UPDATE InvoiceJob u SET u.status = com.app.invoice_bee.entities.InvoiceJobStatus.SAVED, u.updatedAt = :updatedAt WHERE u.id = :id")
    int updateSaved(@Param("id") UUID id, @Param("updatedAt") LocalDateTime updatedAt);

    @Transactional
    @Modifying
    @Query("UPDATE InvoiceJob u SET u.status = com.app.invoice_bee.entities.InvoiceJobStatus.SAVED, u.updatedAt = :updatedAt WHERE u.shopId = :shopId AND u.status = com.app.invoice_bee.entities.InvoiceJobStatus.COMPLETED")
    int markCompletedJobsAsSaved(@Param("shopId") UUID shopId, @Param("updatedAt") LocalDateTime updatedAt);
}
