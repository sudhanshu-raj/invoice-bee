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
import java.util.Optional;
import java.util.UUID;

public interface InvoiceJobRepository extends JpaRepository<InvoiceJob, UUID> {

    Optional<InvoiceJob> findByIdAndShopId(UUID id, UUID shopId);

    @Transactional
    @Modifying
    @Query("UPDATE InvoiceJob u SET u.status = :status, u.updatedAt = :updatedAt WHERE u.id = :id")
    int updateStatus(@Param("id") UUID id, @Param("status") InvoiceJobStatus status, @Param("updatedAt") LocalDateTime updatedAt);
    
    @Transactional
    @Modifying
    @Query("UPDATE InvoiceJob u SET u.result = :result, u.status = com.app.invoice_bee.entities.InvoiceJobStatus.COMPLETED, u.updatedAt = :updatedAt WHERE u.id = :id")
    int updateSuccess(@Param("id") UUID id, @Param("result") InvoiceScanResponse result, @Param("updatedAt") LocalDateTime updatedAt);
    
    @Transactional
    @Modifying
    @Query("UPDATE InvoiceJob u SET u.failureMessage = :failureMsg, u.status = com.app.invoice_bee.entities.InvoiceJobStatus.FAILED, u.updatedAt = :updatedAt WHERE u.id = :id")
    int updateFailure(@Param("id") UUID id, @Param("failureMsg") String failureMessage, @Param("updatedAt") LocalDateTime updatedAt);
}
