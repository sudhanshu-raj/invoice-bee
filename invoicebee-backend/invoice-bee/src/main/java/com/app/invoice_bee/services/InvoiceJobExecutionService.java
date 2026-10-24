package com.app.invoice_bee.services;

import com.app.invoice_bee.dtos.InvoiceScanResponse;
import com.app.invoice_bee.dtos.ProductMatchDto;
import com.app.invoice_bee.entities.Inventory;
import com.app.invoice_bee.entities.InvoiceData;
import com.app.invoice_bee.entities.InvoiceJob;
import com.app.invoice_bee.entities.InvoiceJobStatus;
import com.app.invoice_bee.entities.Product;
import com.app.invoice_bee.repositories.InventoryRepository;
import com.app.invoice_bee.repositories.InvoiceJobRepository;
import com.app.invoice_bee.repositories.ProductRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class InvoiceJobExecutionService {

    private static final Logger log = LoggerFactory.getLogger(InvoiceJobExecutionService.class);

    private final InvoiceJobRepository invoiceJobRepository;
    private final InvoiceParserService invoiceParserService;
    private final ProductRepository productRepository;
    private final InventoryRepository inventoryRepository;

    public InvoiceJobExecutionService(
            InvoiceJobRepository invoiceJobRepository,
            InvoiceParserService invoiceParserService,
            ProductRepository productRepository,
            InventoryRepository inventoryRepository
    ) {
        this.invoiceJobRepository = invoiceJobRepository;
        this.invoiceParserService = invoiceParserService;
        this.productRepository = productRepository;
        this.inventoryRepository = inventoryRepository;
    }

    public void executeJob(UUID jobId) {
        try {
            InvoiceJob job = invoiceJobRepository.findById(jobId)
                    .orElseThrow(() -> new IllegalArgumentException("Invoice job not found with id: " + jobId));

            updateJobStatus(jobId, InvoiceJobStatus.PROCESSING);

            Path filePath = Paths.get("uploads", "invoices", job.getStoredFileName());
            Resource resource = new FileSystemResource(filePath);
            if (!resource.exists()) {
                throw new IllegalStateException("Invoice file does not exist at: " + filePath);
            }

            String ocrRawText = invoiceParserService.extractOcrText(resource);
            updateJobStatus(jobId, InvoiceJobStatus.EXTRACTED);

            InvoiceData invoiceData = invoiceParserService.parseOcrTextToInvoiceWithGemini(ocrRawText);
            updateJobStatus(jobId, InvoiceJobStatus.POLISHED);

            List<Product> shopProducts = productRepository.findByShopId(job.getShopId());
            List<ProductMatchDto> availableProducts = new ArrayList<>();
            for (Product p : shopProducts) {
                BigDecimal stock = inventoryRepository.findByProductId(p.getId())
                        .map(Inventory::getQuantityOnHand)
                        .orElse(BigDecimal.ZERO);
                availableProducts.add(new ProductMatchDto(
                        p.getId(),
                        p.getName(),
                        p.getSku(),
                        p.getSellingPrice(),
                        p.getMrp(),
                        p.getLastPurchaseCost(),
                        stock,
                        p.getQrToken()
                ));
            }

            String sourceFileUrl = "/uploads/invoices/" + job.getStoredFileName();
            InvoiceScanResponse scanResponse = new InvoiceScanResponse(invoiceData, availableProducts, sourceFileUrl);

            completeJob(jobId, scanResponse);
        } catch (Exception ex) {
            log.error("Failed processing invoice job {}: {}", jobId, ex.getMessage(), ex);
            failJob(jobId, ex.getMessage());
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void updateJobStatus(UUID jobId, InvoiceJobStatus status) {
        invoiceJobRepository.updateStatus(jobId, status, LocalDateTime.now());
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void completeJob(UUID jobId, InvoiceScanResponse response) {
        invoiceJobRepository.updateSuccess(jobId, response, LocalDateTime.now());
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void failJob(UUID jobId, String failureMessage) {
        invoiceJobRepository.updateFailure(jobId, failureMessage, LocalDateTime.now());
    }

    public InvoiceScanResponse generateSampleScanResponse(UUID shopId) {
        InvoiceData invoiceData = invoiceParserService.createFallbackInvoiceData();
        List<Product> shopProducts = productRepository.findByShopId(shopId);
        List<ProductMatchDto> availableProducts = new ArrayList<>();
        for (Product p : shopProducts) {
            BigDecimal stock = inventoryRepository.findByProductId(p.getId())
                    .map(Inventory::getQuantityOnHand)
                    .orElse(BigDecimal.ZERO);
            availableProducts.add(new ProductMatchDto(
                    p.getId(),
                    p.getName(),
                    p.getSku(),
                    p.getSellingPrice(),
                    p.getMrp(),
                    p.getLastPurchaseCost(),
                    stock,
                    p.getQrToken()
            ));
        }
        return new InvoiceScanResponse(invoiceData, availableProducts, null);
    }
}
