package com.app.invoice_bee.repositories;

import com.app.invoice_bee.entities.CustomerEnquiry;
import com.app.invoice_bee.entities.EnquiryStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CustomerEnquiryRepository extends JpaRepository<CustomerEnquiry, UUID> {

    List<CustomerEnquiry> findByShopIdOrderByCreatedAtDesc(UUID shopId);

    List<CustomerEnquiry> findByShopIdAndStatusOrderByCreatedAtDesc(UUID shopId, EnquiryStatus status);

    Optional<CustomerEnquiry> findByIdAndShopId(UUID id, UUID shopId);

    @Query("SELECT e FROM CustomerEnquiry e WHERE e.shop.id = :shopId AND e.nextFollowUpDate <= :date AND e.status IN :statuses ORDER BY e.nextFollowUpDate ASC")
    List<CustomerEnquiry> findDueFollowUps(
            @Param("shopId") UUID shopId,
            @Param("date") LocalDate date,
            @Param("statuses") List<EnquiryStatus> statuses
    );

    @Query("SELECT e FROM CustomerEnquiry e WHERE e.shop.id = :shopId AND e.nextFollowUpDate > :date AND e.status IN :statuses ORDER BY e.nextFollowUpDate ASC")
    List<CustomerEnquiry> findUpcomingFollowUps(
            @Param("shopId") UUID shopId,
            @Param("date") LocalDate date,
            @Param("statuses") List<EnquiryStatus> statuses
    );

    @Query("SELECT e FROM CustomerEnquiry e WHERE e.shop.id = :shopId AND e.followUpCount = 0 AND e.status = :status ORDER BY e.createdAt DESC")
    List<CustomerEnquiry> findNoFollowUpYet(
            @Param("shopId") UUID shopId,
            @Param("status") EnquiryStatus status
    );

    long countByShopId(UUID shopId);

    long countByShopIdAndStatus(UUID shopId, EnquiryStatus status);
}
