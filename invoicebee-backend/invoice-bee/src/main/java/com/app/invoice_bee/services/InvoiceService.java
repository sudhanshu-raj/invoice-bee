package com.app.invoice_bee.services;

import com.app.invoice_bee.dtos.InvoiceScanResponse;
import com.app.invoice_bee.dtos.ProductMatchDto;
import com.app.invoice_bee.dtos.PurchaseInvoiceDto;
import com.app.invoice_bee.dtos.SavePurchaseInvoiceItemRequest;
import com.app.invoice_bee.dtos.SavePurchaseInvoiceRequest;
import com.app.invoice_bee.entities.*;
import com.app.invoice_bee.exceptions.DuplicateInvoiceException;
import com.app.invoice_bee.repositories.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Lazy;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class InvoiceService {
    
    private final Logger log = LoggerFactory.getLogger(InvoiceService.class);

    private final UserRepository userRepository;
    private final SupplierRepository supplierRepository;
    private final ProductRepository productRepository;
    private final PurchaseInvoiceRepository purchaseInvoiceRepository;
    private final PurchaseInvoiceItemRepository purchaseInvoiceItemRepository;
    private final ProductPriceRepository productPriceRepository;
    private final InventoryRepository inventoryRepository;
    private final StockMovementRepository stockMovementRepository;
    private final ProductPriceHistoryRepository productPriceHistoryRepository;
    private final ProductCostHistoryRepository productCostHistoryRepository;
    private final ProductIdentifierRepository productIdentifierRepository;
    private final ProductPitchRepository productPitchRepository;
    private final InvoiceJobRepository invoiceJobRepository;
    private final InvoiceProcessingPipeline invoiceProcessingPipeline;
    private final InvoiceJobExecutionService invoiceJobExecutionService;
    private final ProductIngestionPipeline productIngestionPipeline;

    public InvoiceService(
            UserRepository userRepository,
            SupplierRepository supplierRepository,
            ProductRepository productRepository,
            PurchaseInvoiceRepository purchaseInvoiceRepository,
            PurchaseInvoiceItemRepository purchaseInvoiceItemRepository,
            ProductPriceRepository productPriceRepository,
            InventoryRepository inventoryRepository,
            StockMovementRepository stockMovementRepository,
            ProductPriceHistoryRepository productPriceHistoryRepository,
            ProductCostHistoryRepository productCostHistoryRepository,
            ProductIdentifierRepository productIdentifierRepository,
            ProductPitchRepository productPitchRepository,
            InvoiceJobRepository invoiceJobRepository,
            InvoiceProcessingPipeline invoiceProcessingPipeline,
            InvoiceJobExecutionService invoiceJobExecutionService,
            ProductIngestionPipeline productIngestionPipeline
    ) {
        this.userRepository = userRepository;
        this.supplierRepository = supplierRepository;
        this.productRepository = productRepository;
        this.purchaseInvoiceRepository = purchaseInvoiceRepository;
        this.purchaseInvoiceItemRepository = purchaseInvoiceItemRepository;
        this.productPriceRepository = productPriceRepository;
        this.inventoryRepository = inventoryRepository;
        this.stockMovementRepository = stockMovementRepository;
        this.productPriceHistoryRepository = productPriceHistoryRepository;
        this.productCostHistoryRepository = productCostHistoryRepository;
        this.productIdentifierRepository = productIdentifierRepository;
        this.productPitchRepository = productPitchRepository;
        this.invoiceJobRepository = invoiceJobRepository;
        this.invoiceProcessingPipeline = invoiceProcessingPipeline;
        this.invoiceJobExecutionService = invoiceJobExecutionService;
        this.productIngestionPipeline = productIngestionPipeline;
    }

    public InvoiceJobResponse scanInvoice(MultipartFile file, String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new IllegalArgumentException("User not found with email: " + userEmail));

        Shop shop = user.getShop();
        if (shop == null) {
            throw new IllegalStateException("User does not have an active shop. Complete shop setup first.");
        }

        List<InvoiceJobStatus> terminalStatuses = List.of(
                InvoiceJobStatus.SAVED,
                InvoiceJobStatus.FAILED,
                InvoiceJobStatus.CANCELLED
        );
        List<InvoiceJob> existingActiveJobs = invoiceJobRepository.findByShopIdAndStatusNotInOrderByCreatedAtDesc(shop.getId(), terminalStatuses);
        if (!existingActiveJobs.isEmpty()) {
            LocalDateTime cancelTime = LocalDateTime.now();
            for (InvoiceJob existingJob : existingActiveJobs) {
                invoiceProcessingPipeline.cancelJob(existingJob.getId());
                invoiceJobRepository.updateCancelled(existingJob.getId(), "Cancelled automatically due to new invoice scan request", cancelTime);
            }
        }

        if (file == null || file.isEmpty()) {
            InvoiceJob invoiceJob = new InvoiceJob();
            invoiceJob.setShopId(shop.getId());
            invoiceJob.setOriginalFileName("Sample Invoice");
            invoiceJob.setStatus(InvoiceJobStatus.COMPLETED);
            invoiceJob.setCreatedAt(LocalDateTime.now());
            invoiceJob.setUpdatedAt(LocalDateTime.now());
            InvoiceScanResponse sampleResponse = invoiceJobExecutionService.generateSampleScanResponse(shop.getId());
            invoiceJob.setResult(sampleResponse);
            InvoiceJob saved = invoiceJobRepository.save(invoiceJob);
            return new InvoiceJobResponse(saved.getId(), saved.getStatus(), saved.getResult(), saved.getOriginalFileName(), saved.getCreatedAt(), saved.getUpdatedAt());
        }

        String fileId = UUID.randomUUID().toString();
        String originalFilename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "invoice.png";
        String cleanName = originalFilename.replaceAll("[^a-zA-Z0-9._-]", "_");
        String storedFilename = fileId + "_" + cleanName;

        try {
            Path uploadDir = Paths.get("uploads", "invoices");
            if (!Files.exists(uploadDir)) {
                Files.createDirectories(uploadDir);
            }
            Path destination = uploadDir.resolve(storedFilename);
            Files.copy(file.getInputStream(), destination, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            log.error("Failed to store uploaded invoice file: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to store uploaded invoice file: " + e.getMessage(), e);
        }

        InvoiceJob invoiceJob = new InvoiceJob();
        invoiceJob.setShopId(shop.getId());
        invoiceJob.setStoredFileName(storedFilename);
        invoiceJob.setOriginalFileName(originalFilename);
        invoiceJob.setStatus(InvoiceJobStatus.UPLOADED);
        invoiceJob.setCreatedAt(LocalDateTime.now());
        invoiceJob.setUpdatedAt(LocalDateTime.now());

        InvoiceJob savedEntity = invoiceJobRepository.saveAndFlush(invoiceJob);
        if (TransactionSynchronizationManager.isActualTransactionActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    invoiceProcessingPipeline.submitJob(savedEntity.getId());
                }
            });
        } else {
            invoiceProcessingPipeline.submitJob(savedEntity.getId());
        }
        return new InvoiceJobResponse(savedEntity.getId(), savedEntity.getStatus(), null, savedEntity.getOriginalFileName(), savedEntity.getCreatedAt(), savedEntity.getUpdatedAt());
    }

    @Transactional
    public PurchaseInvoiceDto saveInvoice(SavePurchaseInvoiceRequest request, String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new IllegalArgumentException("User not found with email: " + userEmail));

        Shop shop = user.getShop();
        if (shop == null) {
            throw new IllegalStateException("User does not have an active shop configured.");
        }

        Supplier supplier = resolveSupplier(shop, request);
        String invNum = request.getInvoiceNumber() != null ? request.getInvoiceNumber().trim() : "INV-" + System.currentTimeMillis();

        Optional<PurchaseInvoice> existingOpt = supplier != null
                ? purchaseInvoiceRepository.findByShopIdAndSupplierIdAndInvoiceNumber(shop.getId(), supplier.getId(), invNum)
                : Optional.empty();

        if (existingOpt.isPresent()) {
            PurchaseInvoice existing = existingOpt.get();
            if (!Boolean.TRUE.equals(request.getUpdateExisting())) {
                throw new DuplicateInvoiceException(
                        existing.getId(),
                        existing.getInvoiceNumber(),
                        supplier != null ? supplier.getName() : "Unknown",
                        existing.getInvoiceDate(),
                        existing.getTotalAmount()
                );
            }
        }

        PurchaseInvoice invoice;
        if (existingOpt.isPresent()) {
            invoice = existingOpt.get();
            List<PurchaseInvoiceItem> oldItems = purchaseInvoiceItemRepository.findByInvoiceId(invoice.getId());
            for (PurchaseInvoiceItem oldItem : oldItems) {
                if (oldItem.getProduct() != null) {
                    inventoryRepository.findByProductId(oldItem.getProduct().getId()).ifPresent(inv -> {
                        BigDecimal currQty = inv.getQuantityOnHand() != null ? inv.getQuantityOnHand() : BigDecimal.ZERO;
                        BigDecimal revertedQty = currQty.subtract(oldItem.getQuantity());
                        if (revertedQty.compareTo(BigDecimal.ZERO) < 0) {
                            revertedQty = BigDecimal.ZERO;
                        }
                        inv.setQuantityOnHand(revertedQty);
                        inv.setUpdatedAt(OffsetDateTime.now());
                        inventoryRepository.save(inv);
                    });
                }
            }

            if (!oldItems.isEmpty()) {
                List<UUID> oldItemIds = oldItems.stream().map(PurchaseInvoiceItem::getId).toList();
                productCostHistoryRepository.deleteByInvoiceItemIds(oldItemIds);
            }

            stockMovementRepository.deleteByInvoiceId(invoice.getId());
            purchaseInvoiceItemRepository.deleteByInvoiceId(invoice.getId());

            invoice.setPaymentMode(parsePaymentMode(request.getPaymentMode()));
            invoice.setInvoiceDate(parseDate(request.getInvoiceDate()));
            invoice.setStatus(InvoiceStatus.POSTED);
            if (request.getSourceFileUrl() != null && !request.getSourceFileUrl().isBlank()) {
                invoice.setSourceFileUrl(request.getSourceFileUrl());
            }
            invoice.setSubtotal(request.getSubtotal() != null ? request.getSubtotal() : BigDecimal.ZERO);
            invoice.setTaxAmount(request.getTaxAmount() != null ? request.getTaxAmount() : BigDecimal.ZERO);
            invoice.setTotalAmount(request.getTotalAmount() != null ? request.getTotalAmount() : BigDecimal.ZERO);
            invoice.setPostedAt(OffsetDateTime.now());
        } else {
            invoice = new PurchaseInvoice();
            invoice.setShop(shop);
            invoice.setSupplier(supplier);
            invoice.setInvoiceNumber(invNum);
            invoice.setPaymentMode(parsePaymentMode(request.getPaymentMode()));
            invoice.setInvoiceDate(parseDate(request.getInvoiceDate()));
            invoice.setStatus(InvoiceStatus.POSTED);
            invoice.setSourceFileUrl(request.getSourceFileUrl());
            invoice.setSubtotal(request.getSubtotal() != null ? request.getSubtotal() : BigDecimal.ZERO);
            invoice.setTaxAmount(request.getTaxAmount() != null ? request.getTaxAmount() : BigDecimal.ZERO);
            invoice.setTotalAmount(request.getTotalAmount() != null ? request.getTotalAmount() : BigDecimal.ZERO);
            invoice.setCreatedAt(OffsetDateTime.now());
            invoice.setPostedAt(OffsetDateTime.now());
        }

        PurchaseInvoice savedInvoice = purchaseInvoiceRepository.save(invoice);
        List<Product> affectedProducts = new ArrayList<>();

        for (SavePurchaseInvoiceItemRequest itemReq : request.getItems()) {
            Product product = resolveProduct(shop, itemReq);
            affectedProducts.add(product);

            ProductPrice price = productPriceRepository.findByProductId(product.getId())
                    .orElseGet(() -> {
                        ProductPrice p = new ProductPrice();
                        p.setShopId(shop.getId());
                        p.setProduct(product);
                        p.setCreatedAt(OffsetDateTime.now());
                        return p;
                    });
            price.setBuyingPrice(itemReq.getUnitCost());
            price.setSellingPrice(itemReq.getSellingPrice());
            price.setMrp(itemReq.getMrp());

            BigDecimal effDiscountPrice = itemReq.getDiscountPrice();
            if (effDiscountPrice == null && itemReq.getDiscountPercentage() != null && itemReq.getDiscountPercentage().compareTo(BigDecimal.ZERO) > 0 && itemReq.getSellingPrice() != null) {
                BigDecimal discountVal = itemReq.getSellingPrice().multiply(itemReq.getDiscountPercentage()).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
                effDiscountPrice = itemReq.getSellingPrice().subtract(discountVal);
            }
            price.setDiscountPrice(effDiscountPrice);
            price.setUpdatedAt(OffsetDateTime.now());
            productPriceRepository.save(price);

            if (itemReq.getHsnSac() != null && !itemReq.getHsnSac().isBlank()) {
                String hsn = itemReq.getHsnSac().trim();
                boolean exists = productIdentifierRepository.findByProductId(product.getId()).stream()
                        .anyMatch(id -> id.getIdentifierType() == IdentifierType.HSN && id.getIdentifierValue().equals(hsn));
                if (!exists) {
                    ProductIdentifier identifier = new ProductIdentifier();
                    identifier.setShopId(shop.getId());
                    identifier.setProduct(product);
                    identifier.setIdentifierType(IdentifierType.HSN);
                    identifier.setIdentifierValue(hsn);
                    identifier.setCreatedAt(OffsetDateTime.now());
                    productIdentifierRepository.save(identifier);
                }
            }

            if (itemReq.getDescription() != null && !itemReq.getDescription().isBlank()) {
                ProductPitch pitch = new ProductPitch();
                pitch.setShopId(shop.getId());
                pitch.setProduct(product);
                pitch.setLanguage("en");
                pitch.setPitchText(itemReq.getDescription().trim());
                pitch.setModelName("manual");
                pitch.setCreatedAt(OffsetDateTime.now());
                productPitchRepository.save(pitch);
            }

            PurchaseInvoiceItem invoiceItem = new PurchaseInvoiceItem();
            invoiceItem.setShopId(shop.getId());
            invoiceItem.setInvoice(savedInvoice);
            invoiceItem.setProduct(product);
            invoiceItem.setDescription(itemReq.getName().trim());
            invoiceItem.setQuantity(itemReq.getQuantity());
            invoiceItem.setUnitCost(itemReq.getUnitCost());

            BigDecimal discountAmt = itemReq.getDiscountAmount();
            if ((discountAmt == null || discountAmt.compareTo(BigDecimal.ZERO) == 0) && itemReq.getDiscountPercentage() != null && itemReq.getDiscountPercentage().compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal base = itemReq.getUnitCost().multiply(itemReq.getQuantity());
                discountAmt = base.multiply(itemReq.getDiscountPercentage()).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
            }
            invoiceItem.setDiscountAmount(discountAmt != null ? discountAmt : BigDecimal.ZERO);
            invoiceItem.setTaxRate(itemReq.getTaxRate());
            invoiceItem.setTaxAmount(itemReq.getTaxAmount());
            BigDecimal lineTotal = itemReq.getLineTotal() != null ? itemReq.getLineTotal() : itemReq.getQuantity().multiply(itemReq.getUnitCost());
            invoiceItem.setLineTotal(lineTotal);
            invoiceItem.setMatchConfidence(itemReq.getMatchConfidence());
            invoiceItem.setCreatedAt(OffsetDateTime.now());
            PurchaseInvoiceItem savedInvoiceItem = purchaseInvoiceItemRepository.save(invoiceItem);

            ProductCostHistory costHistory = new ProductCostHistory();
            costHistory.setShopId(shop.getId());
            costHistory.setProduct(product);
            costHistory.setInvoiceItem(savedInvoiceItem);
            costHistory.setUnitCost(itemReq.getUnitCost());
            costHistory.setRecordedAt(OffsetDateTime.now());
            productCostHistoryRepository.save(costHistory);

            Inventory inventory = inventoryRepository.findByProductId(product.getId())
                    .orElseGet(() -> {
                        Inventory inv = new Inventory();
                        inv.setProduct(product);
                        inv.setQuantityOnHand(BigDecimal.ZERO);
                        inv.setAverageUnitCost(BigDecimal.ZERO);
                        inv.setUpdatedAt(OffsetDateTime.now());
                        return inv;
                    });

            BigDecimal oldQty = inventory.getQuantityOnHand() != null ? inventory.getQuantityOnHand() : BigDecimal.ZERO;
            BigDecimal oldAvgCost = inventory.getAverageUnitCost() != null ? inventory.getAverageUnitCost() : BigDecimal.ZERO;
            BigDecimal newQty = oldQty.add(itemReq.getQuantity());

            BigDecimal newAvgCost;
            if (newQty.compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal oldTotalVal = oldQty.multiply(oldAvgCost);
                BigDecimal newTotalVal = itemReq.getQuantity().multiply(itemReq.getUnitCost());
                newAvgCost = oldTotalVal.add(newTotalVal).divide(newQty, 4, RoundingMode.HALF_UP);
            } else {
                newAvgCost = itemReq.getUnitCost();
            }

            inventory.setQuantityOnHand(newQty);
            inventory.setAverageUnitCost(newAvgCost);
            inventory.setUpdatedAt(OffsetDateTime.now());
            inventoryRepository.save(inventory);

            StockMovement stockMovement = new StockMovement();
            stockMovement.setShopId(shop.getId());
            stockMovement.setProduct(product);
            stockMovement.setInvoice(savedInvoice);
            stockMovement.setMovementType(MovementType.PURCHASE);
            stockMovement.setQuantityDelta(itemReq.getQuantity());
            stockMovement.setUnitCost(itemReq.getUnitCost());
            stockMovement.setNote("Purchase invoice " + savedInvoice.getInvoiceNumber());
            stockMovement.setCreatedAt(OffsetDateTime.now());
            stockMovementRepository.save(stockMovement);
        }

        for (Product prod : affectedProducts) {
            productIngestionPipeline.queueProductIngestion(prod, shop.getId());
        }

        LocalDateTime now = LocalDateTime.now();
        if (request.getJobId() != null) {
            invoiceJobRepository.updateSaved(request.getJobId(), now);
        }
        invoiceJobRepository.markCompletedJobsAsSaved(shop.getId(), now);

        return new PurchaseInvoiceDto(
                savedInvoice.getId(),
                savedInvoice.getInvoiceNumber(),
                savedInvoice.getInvoiceDate(),
                supplier != null ? supplier.getName() : "Unknown",
                savedInvoice.getTotalAmount(),
                savedInvoice.getStatus().name(),
                request.getItems().size(),
                savedInvoice.getCreatedAt(),
                savedInvoice.getSourceFileUrl()
        );
    }
    
    @Transactional(readOnly = true)
    public InvoiceJobResponse getInvoiceJobStatus(UUID id, String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new IllegalArgumentException("User not found with email: " + userEmail));
        Shop shop = user.getShop();
        if (shop == null) {
            throw new IllegalStateException("User does not have an active shop configured.");
        }

        InvoiceJob invoiceJob = invoiceJobRepository.findByIdAndShopId(id, shop.getId())
                .orElseThrow(() -> new IllegalArgumentException("Invoice job not found with id: " + id));

        return new InvoiceJobResponse(
                invoiceJob.getId(),
                invoiceJob.getStatus(),
                invoiceJob.getResult(),
                invoiceJob.getOriginalFileName(),
                invoiceJob.getCreatedAt(),
                invoiceJob.getUpdatedAt()
        );
    }

    @Transactional(readOnly = true)
    public List<InvoiceJobResponse> getActiveInvoiceJobs(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new IllegalArgumentException("User not found with email: " + userEmail));
        Shop shop = user.getShop();
        if (shop == null) {
            return List.of();
        }

        List<InvoiceJobStatus> terminalStatuses = List.of(
                InvoiceJobStatus.SAVED,
                InvoiceJobStatus.FAILED,
                InvoiceJobStatus.CANCELLED
        );

        List<InvoiceJob> jobs = invoiceJobRepository.findByShopIdAndStatusNotInOrderByCreatedAtDesc(shop.getId(), terminalStatuses);
        List<InvoiceJobResponse> responses = new ArrayList<>();
        for (InvoiceJob job : jobs) {
            responses.add(new InvoiceJobResponse(
                    job.getId(),
                    job.getStatus(),
                    job.getResult(),
                    job.getOriginalFileName(),
                    job.getCreatedAt(),
                    job.getUpdatedAt()
            ));
        }
        return responses;
    }

    @Transactional
    public InvoiceJobResponse cancelInvoiceJob(UUID id, String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new IllegalArgumentException("User not found with email: " + userEmail));
        Shop shop = user.getShop();
        if (shop == null) {
            throw new IllegalStateException("User does not have an active shop configured.");
        }

        InvoiceJob invoiceJob = invoiceJobRepository.findByIdAndShopId(id, shop.getId())
                .orElseThrow(() -> new IllegalArgumentException("Invoice job not found with id: " + id));

        invoiceProcessingPipeline.cancelJob(id);
        invoiceJobRepository.updateCancelled(id, "Job cancelled by user", LocalDateTime.now());
        invoiceJob.setStatus(InvoiceJobStatus.CANCELLED);
        invoiceJob.setFailureMessage("Job cancelled by user");
        invoiceJob.setUpdatedAt(LocalDateTime.now());

        return new InvoiceJobResponse(
                invoiceJob.getId(),
                invoiceJob.getStatus(),
                invoiceJob.getResult(),
                invoiceJob.getOriginalFileName(),
                invoiceJob.getCreatedAt(),
                invoiceJob.getUpdatedAt()
        );
    }

    @Transactional
    public List<InvoiceJobResponse> cancelAllActiveInvoiceJobs(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new IllegalArgumentException("User not found with email: " + userEmail));
        Shop shop = user.getShop();
        if (shop == null) {
            return List.of();
        }

        List<InvoiceJobStatus> terminalStatuses = List.of(
                InvoiceJobStatus.SAVED,
                InvoiceJobStatus.FAILED,
                InvoiceJobStatus.CANCELLED
        );

        List<InvoiceJob> jobs = invoiceJobRepository.findByShopIdAndStatusNotInOrderByCreatedAtDesc(shop.getId(), terminalStatuses);
        List<InvoiceJobResponse> cancelled = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();
        for (InvoiceJob job : jobs) {
            invoiceProcessingPipeline.cancelJob(job.getId());
            invoiceJobRepository.updateCancelled(job.getId(), "Job cancelled by user", now);
            job.setStatus(InvoiceJobStatus.CANCELLED);
            job.setFailureMessage("Job cancelled by user");
            job.setUpdatedAt(now);
            cancelled.add(new InvoiceJobResponse(
                    job.getId(),
                    job.getStatus(),
                    job.getResult(),
                    job.getOriginalFileName(),
                    job.getCreatedAt(),
                    job.getUpdatedAt()
            ));
        }
        return cancelled;
    }
    
    private Supplier resolveSupplier(Shop shop, SavePurchaseInvoiceRequest request) {
        if (request.getSupplierGstin() != null && !request.getSupplierGstin().isBlank()) {
            Optional<Supplier> byGstin = supplierRepository.findByShopIdAndGstin(shop.getId(), request.getSupplierGstin().trim());
            if (byGstin.isPresent()) {
                return byGstin.get();
            }
        }

        if (request.getSupplierName() != null && !request.getSupplierName().isBlank()) {
            String name = request.getSupplierName().trim();
            Optional<Supplier> byName = supplierRepository.findByShopIdAndNameIgnoreCase(shop.getId(), name);
            if (byName.isPresent()) {
                return byName.get();
            }

            Supplier newSupplier = new Supplier();
            newSupplier.setShop(shop);
            newSupplier.setName(name);
            newSupplier.setPhone(request.getSupplierPhone() != null && !request.getSupplierPhone().isBlank() ? request.getSupplierPhone().trim() : null);
            newSupplier.setGstin(request.getSupplierGstin() != null && !request.getSupplierGstin().isBlank() ? request.getSupplierGstin().trim() : null);
            newSupplier.setCreatedAt(OffsetDateTime.now());
            return supplierRepository.save(newSupplier);
        }

        return null;
    }

    private Product resolveProduct(Shop shop, SavePurchaseInvoiceItemRequest itemReq) {
        if (itemReq.getMatchedProductId() != null) {
            Optional<Product> matched = productRepository.findById(itemReq.getMatchedProductId());
            if (matched.isPresent() && matched.get().getShop().getId().equals(shop.getId())) {
                return updateExistingProduct(matched.get(), itemReq);
            }
        }

        if (itemReq.getSku() != null && !itemReq.getSku().isBlank()) {
            Optional<Product> bySku = productRepository.findByShopIdAndSku(shop.getId(), itemReq.getSku().trim());
            if (bySku.isPresent()) {
                return updateExistingProduct(bySku.get(), itemReq);
            }
        }

        Optional<Product> byName = productRepository.findByShopIdAndNameIgnoreCase(shop.getId(), itemReq.getName().trim());
        if (byName.isPresent()) {
            return updateExistingProduct(byName.get(), itemReq);
        }

        Product newProduct = new Product();
        newProduct.setShop(shop);
        newProduct.setName(itemReq.getName().trim());
        newProduct.setSku(generateSku(shop.getId(), itemReq.getSku(), itemReq.getName()));
        newProduct.setCategory(itemReq.getCategory() != null && !itemReq.getCategory().isBlank() ? itemReq.getCategory().trim() : "General");
        newProduct.setUnit(itemReq.getUnit() != null && !itemReq.getUnit().isBlank() ? itemReq.getUnit().trim() : "PIECE");
        newProduct.setSellingPrice(itemReq.getSellingPrice());
        newProduct.setMrp(itemReq.getMrp());
        newProduct.setLastPurchaseCost(itemReq.getUnitCost());
        newProduct.setQrToken(UUID.randomUUID());
        newProduct.setActive(true);
        newProduct.setCreatedAt(OffsetDateTime.now());
        newProduct.setUpdatedAt(OffsetDateTime.now());
        return productRepository.save(newProduct);
    }

    private Product updateExistingProduct(Product existing, SavePurchaseInvoiceItemRequest itemReq) {
        if (existing.getSellingPrice() != null && existing.getSellingPrice().compareTo(itemReq.getSellingPrice()) != 0) {
            ProductPriceHistory history = new ProductPriceHistory();
            history.setShopId(existing.getShop().getId());
            history.setProduct(existing);
            history.setOldPrice(existing.getSellingPrice());
            history.setNewPrice(itemReq.getSellingPrice());
            history.setReason("Updated via purchase invoice");
            history.setChangedAt(OffsetDateTime.now());
            productPriceHistoryRepository.save(history);
        }

        existing.setSellingPrice(itemReq.getSellingPrice());
        if (itemReq.getMrp() != null) {
            existing.setMrp(itemReq.getMrp());
        }
        existing.setLastPurchaseCost(itemReq.getUnitCost());
        existing.setUpdatedAt(OffsetDateTime.now());
        return productRepository.save(existing);
    }

    private String generateSku(UUID shopId, String requestedSku, String name) {
        if (requestedSku != null && !requestedSku.isBlank()) {
            String candidate = requestedSku.trim();
            if (productRepository.findByShopIdAndSku(shopId, candidate).isEmpty()) {
                return candidate;
            }
        }

        String prefix = "PRD";
        if (name != null && name.trim().length() >= 3) {
            prefix = name.replaceAll("[^a-zA-Z0-9]", "").toUpperCase();
            if (prefix.length() > 4) {
                prefix = prefix.substring(0, 4);
            }
        }
        String randomSuffix = UUID.randomUUID().toString().replace("-", "").substring(0, 6).toUpperCase();
        return prefix + "-" + randomSuffix;
    }

    private PaymentMode parsePaymentMode(String mode) {
        if (mode == null || mode.isBlank()) {
            return PaymentMode.CASH;
        }
        try {
            return PaymentMode.valueOf(mode.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            return PaymentMode.CREDIT;
        }
    }

    private LocalDate parseDate(String dateStr) {
        if (dateStr == null || dateStr.isBlank()) {
            return LocalDate.now();
        }
        try {
            return LocalDate.parse(dateStr.trim(), DateTimeFormatter.ISO_LOCAL_DATE);
        } catch (Exception e1) {
            try {
                return LocalDate.parse(dateStr.trim(), DateTimeFormatter.ofPattern("dd-MM-yyyy"));
            } catch (Exception e2) {
                return LocalDate.now();
            }
        }
    }
}
