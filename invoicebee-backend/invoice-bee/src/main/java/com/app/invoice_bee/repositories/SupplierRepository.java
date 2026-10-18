package com.app.invoice_bee.repositories;

import com.app.invoice_bee.entities.Supplier;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SupplierRepository extends JpaRepository<Supplier, UUID> {
    Optional<Supplier> findByShopIdAndGstin(UUID shopId, String gstin);
    Optional<Supplier> findByShopIdAndNameIgnoreCase(UUID shopId, String name);
    List<Supplier> findByShopId(UUID shopId);
}
