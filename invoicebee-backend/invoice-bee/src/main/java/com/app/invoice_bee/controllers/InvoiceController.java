package com.app.invoice_bee.controllers;

import com.app.invoice_bee.dtos.InvoiceScanResponse;
import com.app.invoice_bee.dtos.PurchaseInvoiceDetailDto;
import com.app.invoice_bee.dtos.PurchaseInvoiceDto;
import com.app.invoice_bee.dtos.SavePurchaseInvoiceRequest;
import com.app.invoice_bee.entities.InvoiceJobResponse;
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

import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.PathVariable;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

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
    public ResponseEntity<InvoiceJobResponse> scanInvoice(
            @RequestParam(value = "file", required = false) MultipartFile file,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        InvoiceJobResponse response = invoiceService.scanInvoice(file, userDetails.getUsername());
        return ResponseEntity.ok(response);
    }
    
    @GetMapping("/jobs/status/{id}")
    public ResponseEntity<InvoiceJobResponse> getInvoiceJobStatus(@PathVariable("id") UUID id, @AuthenticationPrincipal UserDetails userDetails) {
        InvoiceJobResponse response = invoiceService.getInvoiceJobStatus(id, userDetails.getUsername());
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
                    inv.getCreatedAt(),
                    inv.getSourceFileUrl()
            ));
        }
        return ResponseEntity.ok(result);
    }

    @GetMapping("/{id}")
    public ResponseEntity<PurchaseInvoiceDetailDto> getInvoiceById(
            @PathVariable("id") UUID id,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("User not found with email: " + userDetails.getUsername()));
        Shop shop = user.getShop();
        if (shop == null) {
            return ResponseEntity.notFound().build();
        }

        PurchaseInvoice inv = purchaseInvoiceRepository.findByShopIdAndId(shop.getId(), id)
                .orElseThrow(() -> new IllegalArgumentException("Invoice not found with id: " + id));

        List<com.app.invoice_bee.dtos.PurchaseInvoiceItemDto> itemDtos = new ArrayList<>();
        for (com.app.invoice_bee.entities.PurchaseInvoiceItem it : inv.getItems()) {
            itemDtos.add(new com.app.invoice_bee.dtos.PurchaseInvoiceItemDto(
                    it.getId(),
                    it.getProduct() != null ? it.getProduct().getId() : null,
                    it.getProduct() != null ? it.getProduct().getName() : it.getDescription(),
                    it.getProduct() != null ? it.getProduct().getSku() : null,
                    it.getDescription(),
                    it.getQuantity(),
                    it.getUnitCost(),
                    it.getDiscountAmount(),
                    it.getTaxRate(),
                    it.getTaxAmount(),
                    it.getLineTotal()
            ));
        }

        com.app.invoice_bee.dtos.PurchaseInvoiceDetailDto detail = new com.app.invoice_bee.dtos.PurchaseInvoiceDetailDto(
                inv.getId(),
                inv.getInvoiceNumber(),
                inv.getInvoiceDate(),
                inv.getSupplier() != null ? inv.getSupplier().getName() : "Unknown",
                inv.getSupplier() != null ? inv.getSupplier().getGstin() : null,
                inv.getSupplier() != null ? inv.getSupplier().getPhone() : null,
                inv.getPaymentMode() != null ? inv.getPaymentMode().name() : null,
                inv.getSubtotal(),
                inv.getTaxAmount(),
                inv.getTotalAmount(),
                inv.getStatus().name(),
                inv.getSourceFileUrl(),
                inv.getCreatedAt(),
                inv.getPostedAt(),
                itemDtos
        );

        return ResponseEntity.ok(detail);
    }

    @GetMapping("/{id}/file")
    public ResponseEntity<Resource> getInvoiceFile(
            @PathVariable("id") UUID id,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("User not found with email: " + userDetails.getUsername()));
        Shop shop = user.getShop();
        if (shop == null) {
            return ResponseEntity.notFound().build();
        }

        PurchaseInvoice inv = purchaseInvoiceRepository.findByShopIdAndId(shop.getId(), id)
                .orElseThrow(() -> new IllegalArgumentException("Invoice not found with id: " + id));

        String sourceFileUrl = inv.getSourceFileUrl();
        if (sourceFileUrl == null || sourceFileUrl.isBlank()) {
            return ResponseEntity.notFound().build();
        }

        try {
            String relativePath = sourceFileUrl.startsWith("/") ? sourceFileUrl.substring(1) : sourceFileUrl;
            Path filePath = Paths.get(relativePath).normalize().toAbsolutePath();
            Path allowedBase = Paths.get("uploads", "invoices").normalize().toAbsolutePath();

            if (!filePath.startsWith(allowedBase) || !Files.exists(filePath) || !Files.isReadable(filePath)) {
                return ResponseEntity.notFound().build();
            }

            Resource resource = new UrlResource(filePath.toUri());
            String contentType = Files.probeContentType(filePath);
            if (contentType == null) {
                contentType = MediaType.APPLICATION_OCTET_STREAM_VALUE;
            }

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filePath.getFileName().toString() + "\"")
                    .body(resource);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}
