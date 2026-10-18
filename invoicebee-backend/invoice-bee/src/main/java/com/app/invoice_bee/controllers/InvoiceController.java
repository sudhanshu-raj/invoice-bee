package com.app.invoice_bee.controllers;

import com.app.invoice_bee.dtos.InvoiceScanResponse;
import com.app.invoice_bee.dtos.PurchaseInvoiceDto;
import com.app.invoice_bee.dtos.SavePurchaseInvoiceRequest;
import com.app.invoice_bee.entities.PurchaseInvoice;
import com.app.invoice_bee.entities.Shop;
import com.app.invoice_bee.entities.User;
import com.app.invoice_bee.repositories.PurchaseInvoiceRepository;
import com.app.invoice_bee.repositories.UserRepository;
import com.app.invoice_bee.services.InvoiceService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/invoices")
public class InvoiceController {

    private final InvoiceService invoiceService;
    private final UserRepository userRepository;
    private final PurchaseInvoiceRepository purchaseInvoiceRepository;

    public InvoiceController(
            InvoiceService invoiceService,
            UserRepository userRepository,
            PurchaseInvoiceRepository purchaseInvoiceRepository
    ) {
        this.invoiceService = invoiceService;
        this.userRepository = userRepository;
        this.purchaseInvoiceRepository = purchaseInvoiceRepository;
    }

    @PostMapping(value = "/scan", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<InvoiceScanResponse> scanInvoice(
            @RequestParam(value = "file", required = false) MultipartFile file,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        InvoiceScanResponse response = invoiceService.scanInvoice(file, userDetails.getUsername());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/save")
    public ResponseEntity<PurchaseInvoiceDto> saveInvoice(
            @Valid @RequestBody SavePurchaseInvoiceRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        PurchaseInvoiceDto response = invoiceService.saveInvoice(request, userDetails.getUsername());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<List<PurchaseInvoiceDto>> getInvoices(@AuthenticationPrincipal UserDetails userDetails) {
        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("User not found with email: " + userDetails.getUsername()));
        Shop shop = user.getShop();
        if (shop == null) {
            return ResponseEntity.ok(List.of());
        }

        List<PurchaseInvoice> invoices = purchaseInvoiceRepository.findByShopIdOrderByInvoiceDateDesc(shop.getId());
        List<PurchaseInvoiceDto> result = new ArrayList<>();
        for (PurchaseInvoice inv : invoices) {
            result.add(new PurchaseInvoiceDto(
                    inv.getId(),
                    inv.getInvoiceNumber(),
                    inv.getInvoiceDate(),
                    inv.getSupplier() != null ? inv.getSupplier().getName() : "Unknown",
                    inv.getTotalAmount(),
                    inv.getStatus().name(),
                    inv.getItems().size(),
                    inv.getCreatedAt()
            ));
        }
        return ResponseEntity.ok(result);
    }
}
