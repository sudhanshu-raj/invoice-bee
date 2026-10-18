package com.app.invoice_bee.services;

import com.app.invoice_bee.dtos.InvoiceScanResponse;
import com.app.invoice_bee.dtos.ProductMatchDto;
import com.app.invoice_bee.dtos.PurchaseInvoiceDto;
import com.app.invoice_bee.dtos.SavePurchaseInvoiceItemRequest;
import com.app.invoice_bee.dtos.SavePurchaseInvoiceRequest;
import com.app.invoice_bee.entities.IdentifierType;
import com.app.invoice_bee.entities.Inventory;
import com.app.invoice_bee.entities.InvoiceData;
import com.app.invoice_bee.entities.InvoiceStatus;
import com.app.invoice_bee.entities.MovementType;
import com.app.invoice_bee.entities.PaymentMode;
import com.app.invoice_bee.entities.Product;
import com.app.invoice_bee.entities.ProductCostHistory;
import com.app.invoice_bee.entities.ProductIdentifier;
import com.app.invoice_bee.entities.ProductPitch;
import com.app.invoice_bee.entities.ProductPrice;
import com.app.invoice_bee.entities.ProductPriceHistory;
import com.app.invoice_bee.entities.PurchaseInvoice;
import com.app.invoice_bee.entities.PurchaseInvoiceItem;
import com.app.invoice_bee.entities.Shop;
import com.app.invoice_bee.entities.StockMovement;
import com.app.invoice_bee.entities.Supplier;
import com.app.invoice_bee.entities.User;
import com.app.invoice_bee.repositories.InventoryRepository;
import com.app.invoice_bee.repositories.ProductCostHistoryRepository;
import com.app.invoice_bee.repositories.ProductIdentifierRepository;
import com.app.invoice_bee.repositories.ProductPitchRepository;
import com.app.invoice_bee.repositories.ProductPriceHistoryRepository;
import com.app.invoice_bee.repositories.ProductPriceRepository;
import com.app.invoice_bee.repositories.ProductRepository;
import com.app.invoice_bee.repositories.PurchaseInvoiceItemRepository;
import com.app.invoice_bee.repositories.PurchaseInvoiceRepository;
import com.app.invoice_bee.repositories.StockMovementRepository;
import com.app.invoice_bee.repositories.SupplierRepository;
import com.app.invoice_bee.repositories.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class InvoiceService {

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
    private final InvoiceParserService invoiceParserService;

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
            InvoiceParserService invoiceParserService
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
        this.invoiceParserService = invoiceParserService;
    }

    @Transactional(readOnly = true)
    public InvoiceScanResponse scanInvoice(MultipartFile file, String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new IllegalArgumentException("User not found with email: " + userEmail));

        Shop shop = user.getShop();
        if (shop == null) {
            throw new IllegalStateException("User does not have an active shop. Complete shop setup first.");
        }

        String sourceFileUrl = null;
        if (file != null && !file.isEmpty()) {
            try {
                Path uploadDir = Paths.get("uploads", "invoices");
                if (!Files.exists(uploadDir)) {
                    Files.createDirectories(uploadDir);
                }
                String originalFilename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "invoice.png";
                String cleanName = originalFilename.replaceAll("[^a-zA-Z0-9._-]", "_");
                String storedFilename = UUID.randomUUID() + "_" + cleanName;
                Path destination = uploadDir.resolve(storedFilename);
                Files.copy(file.getInputStream(), destination, StandardCopyOption.REPLACE_EXISTING);
                sourceFileUrl = "/uploads/invoices/" + storedFilename;
            } catch (IOException ignored) {
            }
        }

        InvoiceData invoiceData = invoiceParserService.parseUploadedInvoice(file);

        List<Product> shopProducts = productRepository.findByShopId(shop.getId());
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

        return new InvoiceScanResponse(invoiceData, availableProducts, sourceFileUrl);
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

        PurchaseInvoice invoice = new PurchaseInvoice();
        invoice.setShop(shop);
        invoice.setSupplier(supplier);
        invoice.setInvoiceNumber(request.getInvoiceNumber() != null ? request.getInvoiceNumber().trim() : "INV-" + System.currentTimeMillis());
        invoice.setPaymentMode(parsePaymentMode(request.getPaymentMode()));
        invoice.setInvoiceDate(parseDate(request.getInvoiceDate()));
        invoice.setStatus(InvoiceStatus.POSTED);
        invoice.setSourceFileUrl(request.getSourceFileUrl());
        invoice.setSubtotal(request.getSubtotal() != null ? request.getSubtotal() : BigDecimal.ZERO);
        invoice.setTaxAmount(request.getTaxAmount() != null ? request.getTaxAmount() : BigDecimal.ZERO);
        invoice.setTotalAmount(request.getTotalAmount() != null ? request.getTotalAmount() : BigDecimal.ZERO);
        invoice.setCreatedAt(OffsetDateTime.now());
        invoice.setPostedAt(OffsetDateTime.now());

        PurchaseInvoice savedInvoice = purchaseInvoiceRepository.save(invoice);

        for (SavePurchaseInvoiceItemRequest itemReq : request.getItems()) {
            Product product = resolveProduct(shop, itemReq);

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

        return new PurchaseInvoiceDto(
                savedInvoice.getId(),
                savedInvoice.getInvoiceNumber(),
                savedInvoice.getInvoiceDate(),
                supplier != null ? supplier.getName() : "Unknown",
                savedInvoice.getTotalAmount(),
                savedInvoice.getStatus().name(),
                request.getItems().size(),
                savedInvoice.getCreatedAt()
        );
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
