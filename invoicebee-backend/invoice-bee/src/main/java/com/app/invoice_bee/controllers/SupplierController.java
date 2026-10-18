package com.app.invoice_bee.controllers;

import com.app.invoice_bee.dtos.SupplierDto;
import com.app.invoice_bee.entities.PurchaseInvoice;
import com.app.invoice_bee.entities.Shop;
import com.app.invoice_bee.entities.Supplier;
import com.app.invoice_bee.entities.User;
import com.app.invoice_bee.repositories.PurchaseInvoiceRepository;
import com.app.invoice_bee.repositories.SupplierRepository;
import com.app.invoice_bee.repositories.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/suppliers")
public class SupplierController {

    private final SupplierRepository supplierRepository;
    private final PurchaseInvoiceRepository purchaseInvoiceRepository;
    private final UserRepository userRepository;

    public SupplierController(
            SupplierRepository supplierRepository,
            PurchaseInvoiceRepository purchaseInvoiceRepository,
            UserRepository userRepository
    ) {
        this.supplierRepository = supplierRepository;
        this.purchaseInvoiceRepository = purchaseInvoiceRepository;
        this.userRepository = userRepository;
    }

    @GetMapping
    public ResponseEntity<List<SupplierDto>> getShopSuppliers(@AuthenticationPrincipal UserDetails userDetails) {
        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        Shop shop = user.getShop();
        if (shop == null) {
            return ResponseEntity.ok(List.of());
        }

        List<Supplier> suppliers = supplierRepository.findByShopId(shop.getId());
        List<SupplierDto> dtos = new ArrayList<>();
        for (Supplier s : suppliers) {
            List<PurchaseInvoice> invoices = purchaseInvoiceRepository.findByShopIdAndSupplierId(shop.getId(), s.getId());
            BigDecimal totalSpend = invoices.stream()
                    .map(PurchaseInvoice::getTotalAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            dtos.add(new SupplierDto(
                    s.getId(),
                    s.getName(),
                    s.getPhone(),
                    s.getGstin(),
                    invoices.size(),
                    totalSpend,
                    s.getCreatedAt()
            ));
        }
        return ResponseEntity.ok(dtos);
    }

    @PostMapping
    public ResponseEntity<SupplierDto> createSupplier(
            @RequestBody Map<String, String> request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        Shop shop = user.getShop();
        if (shop == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Shop profile required");
        }

        String name = request.get("name");
        if (name == null || name.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Supplier name is required");
        }

        Supplier supplier = new Supplier();
        supplier.setShop(shop);
        supplier.setName(name.trim());
        supplier.setPhone(request.get("phone"));
        supplier.setGstin(request.get("gstin"));
        supplier.setCreatedAt(OffsetDateTime.now());

        Supplier saved = supplierRepository.save(supplier);
        return ResponseEntity.status(HttpStatus.CREATED).body(new SupplierDto(
                saved.getId(),
                saved.getName(),
                saved.getPhone(),
                saved.getGstin(),
                0,
                BigDecimal.ZERO,
                saved.getCreatedAt()
        ));
    }
}
