package com.app.invoice_bee.services;

import com.app.invoice_bee.dtos.InventoryChatRequestDto;
import com.app.invoice_bee.dtos.InventoryChatResponseDto;
import com.app.invoice_bee.dtos.ProductSearchMatchDto;
import com.app.invoice_bee.entities.CustomerEnquiry;
import com.app.invoice_bee.entities.Inventory;
import com.app.invoice_bee.entities.ItemDescription;
import com.app.invoice_bee.entities.Product;
import com.app.invoice_bee.entities.ProductPitch;
import com.app.invoice_bee.entities.ProductPrice;
import com.app.invoice_bee.entities.PurchaseInvoice;
import com.app.invoice_bee.entities.Shop;
import com.app.invoice_bee.entities.Supplier;
import com.app.invoice_bee.entities.User;
import com.app.invoice_bee.repositories.CustomerEnquiryRepository;
import com.app.invoice_bee.repositories.InventoryRepository;
import com.app.invoice_bee.repositories.ItemDescriptionRepository;
import com.app.invoice_bee.repositories.ItemEmbeddingRepository;
import com.app.invoice_bee.repositories.ProductPitchRepository;
import com.app.invoice_bee.repositories.ProductPriceRepository;
import com.app.invoice_bee.repositories.ProductRepository;
import com.app.invoice_bee.repositories.PurchaseInvoiceRepository;
import com.app.invoice_bee.repositories.SupplierRepository;
import com.app.invoice_bee.repositories.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
public class InventoryAssistantService {

    private static final Logger log = LoggerFactory.getLogger(InventoryAssistantService.class);

    private final UserRepository userRepository;
    private final ProductRepository productRepository;
    private final InventoryRepository inventoryRepository;
    private final ProductPriceRepository productPriceRepository;
    private final ProductPitchRepository productPitchRepository;
    private final ItemDescriptionRepository itemDescriptionRepository;
    private final ItemEmbeddingRepository itemEmbeddingRepository;
    private final PurchaseInvoiceRepository purchaseInvoiceRepository;
    private final SupplierRepository supplierRepository;
    private final CustomerEnquiryRepository customerEnquiryRepository;
    private final EmbeddingService embeddingService;
    private final ChatClient geminiChatClient;
    private final ChatClient ollamaChatClient;

    public InventoryAssistantService(
            UserRepository userRepository,
            ProductRepository productRepository,
            InventoryRepository inventoryRepository,
            ProductPriceRepository productPriceRepository,
            ProductPitchRepository productPitchRepository,
            ItemDescriptionRepository itemDescriptionRepository,
            ItemEmbeddingRepository itemEmbeddingRepository,
            PurchaseInvoiceRepository purchaseInvoiceRepository,
            SupplierRepository supplierRepository,
            CustomerEnquiryRepository customerEnquiryRepository,
            EmbeddingService embeddingService,
            @Qualifier("geminiChatClient") ChatClient geminiChatClient,
            @Qualifier("ollamaChatClient") ChatClient ollamaChatClient
    ) {
        this.userRepository = userRepository;
        this.productRepository = productRepository;
        this.inventoryRepository = inventoryRepository;
        this.productPriceRepository = productPriceRepository;
        this.productPitchRepository = productPitchRepository;
        this.itemDescriptionRepository = itemDescriptionRepository;
        this.itemEmbeddingRepository = itemEmbeddingRepository;
        this.purchaseInvoiceRepository = purchaseInvoiceRepository;
        this.supplierRepository = supplierRepository;
        this.customerEnquiryRepository = customerEnquiryRepository;
        this.embeddingService = embeddingService;
        this.geminiChatClient = geminiChatClient;
        this.ollamaChatClient = ollamaChatClient;
    }

    private record ProductSnapshot(
            Product product,
            BigDecimal stock,
            BigDecimal buyingPrice,
            BigDecimal sellingPrice,
            BigDecimal mrp,
            BigDecimal discountPrice,
            BigDecimal marginPercent,
            BigDecimal stockValue,
            String shortPitch,
            String fullDescription,
            String specifications
    ) {}

    @Transactional(readOnly = true)
    public InventoryChatResponseDto chatWithInventory(InventoryChatRequestDto request, String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userEmail));

        Shop shop = user.getShop();
        if (shop == null) {
            return new InventoryChatResponseDto(
                    "Your shop profile is not configured yet. Please complete shop setup to start chatting with your inventory.",
                    "system",
                    0,
                    0,
                    0,
                    BigDecimal.ZERO,
                    List.of()
            );
        }

        UUID shopId = shop.getId();
        String userQuery = request.message() != null ? request.message().trim() : "";
        if (userQuery.isEmpty()) {
            return new InventoryChatResponseDto(
                    "Please enter a question about your inventory, products, margins, suppliers, or purchase invoices.",
                    "system",
                    0,
                    0,
                    0,
                    BigDecimal.ZERO,
                    List.of()
            );
        }

        List<Product> products = productRepository.findByShopId(shopId);
        List<ProductSnapshot> snapshots = new ArrayList<>();

        int lowStockCount = 0;
        int outOfStockCount = 0;
        BigDecimal totalValuation = BigDecimal.ZERO;

        for (Product p : products) {
            BigDecimal stock = inventoryRepository.findByProductId(p.getId())
                    .map(Inventory::getQuantityOnHand)
                    .orElse(BigDecimal.ZERO);

            Optional<ProductPrice> priceOpt = productPriceRepository.findByProductId(p.getId());
            BigDecimal buyingPrice = priceOpt.map(ProductPrice::getBuyingPrice)
                    .orElse(p.getLastPurchaseCost() != null ? p.getLastPurchaseCost() : BigDecimal.ZERO);
            BigDecimal sellingPrice = priceOpt.map(ProductPrice::getSellingPrice)
                    .orElse(p.getSellingPrice() != null ? p.getSellingPrice() : BigDecimal.ZERO);
            BigDecimal mrp = priceOpt.map(ProductPrice::getMrp).orElse(p.getMrp());
            BigDecimal discountPrice = priceOpt.map(ProductPrice::getDiscountPrice).orElse(null);

            BigDecimal effectiveCost = buyingPrice.compareTo(BigDecimal.ZERO) > 0 ? buyingPrice : sellingPrice;
            BigDecimal stockValue = stock.multiply(effectiveCost).setScale(2, RoundingMode.HALF_UP);
            totalValuation = totalValuation.add(stockValue);

            if (stock.compareTo(BigDecimal.ZERO) <= 0) {
                outOfStockCount++;
            } else if (stock.compareTo(new BigDecimal("10")) < 0) {
                lowStockCount++;
            }

            BigDecimal marginPct = BigDecimal.ZERO;
            if (sellingPrice.compareTo(BigDecimal.ZERO) > 0 && buyingPrice.compareTo(BigDecimal.ZERO) > 0) {
                marginPct = sellingPrice.subtract(buyingPrice)
                        .multiply(new BigDecimal("100"))
                        .divide(sellingPrice, 1, RoundingMode.HALF_UP);
            }

            Optional<ItemDescription> descOpt = itemDescriptionRepository.findTopByProductIdOrderByCreatedAtDesc(p.getId());
            String shortPitch = descOpt.map(ItemDescription::getShortPitch).orElse(null);
            String fullDescription = descOpt.map(ItemDescription::getFullDescription).orElse(null);
            String specifications = descOpt.map(ItemDescription::getSpecifications).orElse(null);

            if (shortPitch == null || shortPitch.isBlank()) {
                shortPitch = productPitchRepository.findByProductId(p.getId()).stream()
                        .map(ProductPitch::getPitchText)
                        .findFirst()
                        .orElse(null);
            }

            snapshots.add(new ProductSnapshot(
                    p,
                    stock,
                    buyingPrice,
                    sellingPrice,
                    mrp,
                    discountPrice,
                    marginPct,
                    stockValue,
                    shortPitch,
                    fullDescription,
                    specifications
            ));
        }

        List<ProductSearchMatchDto> hybridMatches = new ArrayList<>();
        try {
            List<Double> queryVec = embeddingService.generateEmbedding(userQuery);
            String vecLiteral = embeddingService.formatVectorLiteral(queryVec);
            hybridMatches = itemEmbeddingRepository.searchHybridByShopId(shopId, userQuery, vecLiteral, 8);
        } catch (Exception ex) {
            log.warn("Hybrid vector search fallback during inventory chat: {}", ex.getMessage());
        }

        Set<UUID> matchedProductIds = new LinkedHashSet<>();
        for (ProductSearchMatchDto m : hybridMatches) {
            if (m.productId() != null) {
                matchedProductIds.add(m.productId());
            }
        }

        String lowerQuery = userQuery.toLowerCase();
        String[] queryTokens = lowerQuery.split("\\s+");
        for (ProductSnapshot snap : snapshots) {
            String pName = snap.product().getName() != null ? snap.product().getName().toLowerCase() : "";
            String pSku = snap.product().getSku() != null ? snap.product().getSku().toLowerCase() : "";
            String pCat = snap.product().getCategory() != null ? snap.product().getCategory().toLowerCase() : "";
            String pBrand = snap.product().getBrand() != null ? snap.product().getBrand().toLowerCase() : "";
            for (String token : queryTokens) {
                if (token.length() >= 3 && (pName.contains(token) || pSku.contains(token) || pCat.contains(token) || pBrand.contains(token))) {
                    matchedProductIds.add(snap.product().getId());
                    break;
                }
            }
        }

        List<InventoryChatResponseDto.MatchedProductContext> matchedContexts = new ArrayList<>();
        for (UUID pid : matchedProductIds) {
            snapshots.stream()
                    .filter(s -> s.product().getId().equals(pid))
                    .findFirst()
                    .ifPresent(s -> {
                        if (matchedContexts.size() < 6) {
                            matchedContexts.add(new InventoryChatResponseDto.MatchedProductContext(
                                    s.product().getId(),
                                    s.product().getName(),
                                    s.product().getSku(),
                                    s.product().getCategory(),
                                    s.stock(),
                                    s.product().getUnit(),
                                    s.buyingPrice(),
                                    s.sellingPrice(),
                                    s.mrp(),
                                    s.marginPercent(),
                                    s.shortPitch()
                            ));
                        }
                    });
        }

        List<PurchaseInvoice> invoices = purchaseInvoiceRepository.findByShopIdOrderByInvoiceDateDesc(shopId);
        List<Supplier> suppliers = supplierRepository.findByShopId(shopId);
        List<CustomerEnquiry> enquiries = customerEnquiryRepository.findByShopIdOrderByCreatedAtDesc(shopId);

        StringBuilder contextBuilder = new StringBuilder();
        contextBuilder.append("SHOP DETAILS:\n");
        contextBuilder.append("- Shop Name: ").append(shop.getName()).append("\n");
        contextBuilder.append("- Owner/User: ").append(user.getFullName() != null ? user.getFullName() : user.getEmail()).append("\n");
        contextBuilder.append("- Total Products in Catalogue: ").append(snapshots.size()).append("\n");
        contextBuilder.append("- Out of Stock Products (0 units): ").append(outOfStockCount).append("\n");
        contextBuilder.append("- Low Stock Products (<10 units): ").append(lowStockCount).append("\n");
        contextBuilder.append("- Total Inventory Valuation (INR): ₹").append(totalValuation).append("\n");
        contextBuilder.append("- Total Recorded Purchase Invoices: ").append(invoices.size()).append("\n");
        contextBuilder.append("- Registered Suppliers: ").append(suppliers.size()).append("\n");
        contextBuilder.append("- Customer Enquiries Logged: ").append(enquiries.size()).append("\n\n");

        if (!hybridMatches.isEmpty()) {
            contextBuilder.append("TOP SEMANTIC / VECTOR PRODUCT INTELLIGENCE MATCHES FOR QUERY:\n");
            int idx = 1;
            for (ProductSearchMatchDto match : hybridMatches) {
                contextBuilder.append(idx++).append(". Product: ").append(match.productName())
                        .append(" | Category: ").append(match.category() != null ? match.category() : "General")
                        .append(" | Selling Price: ₹").append(match.price())
                        .append(" | Match Type: ").append(match.chunkType())
                        .append("\n   Matched Content: ").append(match.matchedChunk() != null ? match.matchedChunk() : "")
                        .append("\n   Pitch: ").append(match.shortPitch() != null ? match.shortPitch() : "")
                        .append("\n   Specs: ").append(match.specifications() != null ? match.specifications() : "{}")
                        .append("\n");
            }
            contextBuilder.append("\n");
        }

        contextBuilder.append("COMPLETE LIVE PRODUCT INVENTORY CATALOGUE:\n");
        if (snapshots.isEmpty()) {
            contextBuilder.append("No products currently in inventory.\n\n");
        } else {
            List<ProductSnapshot> sortedSnapshots = snapshots.stream()
                    .sorted(Comparator.comparing(ProductSnapshot::stockValue).reversed())
                    .limit(120)
                    .toList();
            for (ProductSnapshot s : sortedSnapshots) {
                Product p = s.product();
                contextBuilder.append("- ")
                        .append(p.getName())
                        .append(" [SKU: ").append(p.getSku()).append("]")
                        .append(" | Category: ").append(p.getCategory() != null ? p.getCategory() : "General")
                        .append(" | Stock: ").append(s.stock().stripTrailingZeros().toPlainString()).append(" ").append(p.getUnit() != null ? p.getUnit() : "Nos")
                        .append(" | Buying Cost: ₹").append(s.buyingPrice())
                        .append(" | Selling Price: ₹").append(s.sellingPrice());
                if (s.mrp() != null) {
                    contextBuilder.append(" | MRP: ₹").append(s.mrp());
                }
                if (s.discountPrice() != null) {
                    contextBuilder.append(" | Discount Price: ₹").append(s.discountPrice());
                }
                contextBuilder.append(" | Margin: ").append(s.marginPercent()).append("%")
                        .append(" | Stock Valuation: ₹").append(s.stockValue());
                if (s.shortPitch() != null && !s.shortPitch().isBlank()) {
                    contextBuilder.append(" | Pitch: ").append(s.shortPitch());
                }
                if (s.specifications() != null && !s.specifications().isBlank() && !"{}".equals(s.specifications())) {
                    String specsShort = s.specifications().length() > 300 ? s.specifications().substring(0, 300) + "..." : s.specifications();
                    contextBuilder.append(" | Specs: ").append(specsShort);
                }
                contextBuilder.append("\n");
            }
            contextBuilder.append("\n");
        }

        contextBuilder.append("RECENT PURCHASE INVOICES & SUPPLIER PROCUREMENT:\n");
        if (invoices.isEmpty()) {
            contextBuilder.append("No purchase invoices recorded yet.\n\n");
        } else {
            for (PurchaseInvoice inv : invoices.stream().limit(20).toList()) {
                String suppName = inv.getSupplier() != null ? inv.getSupplier().getName() : "Unknown Supplier";
                contextBuilder.append("- Invoice #").append(inv.getInvoiceNumber())
                        .append(" | Date: ").append(inv.getInvoiceDate())
                        .append(" | Supplier: ").append(suppName)
                        .append(" | Payment Mode: ").append(inv.getPaymentMode() != null ? inv.getPaymentMode().name() : "N/A")
                        .append(" | Subtotal: ₹").append(inv.getSubtotal())
                        .append(" | Tax: ₹").append(inv.getTaxAmount())
                        .append(" | Total: ₹").append(inv.getTotalAmount())
                        .append(" | Items Count: ").append(inv.getItems() != null ? inv.getItems().size() : 0)
                        .append("\n");
            }
            contextBuilder.append("\n");
        }

        if (!suppliers.isEmpty()) {
            contextBuilder.append("SUPPLIERS LIST:\n");
            for (Supplier sup : suppliers.stream().limit(30).toList()) {
                contextBuilder.append("- ").append(sup.getName());
                if (sup.getGstin() != null && !sup.getGstin().isBlank()) {
                    contextBuilder.append(" | GSTIN: ").append(sup.getGstin());
                }
                if (sup.getPhone() != null && !sup.getPhone().isBlank()) {
                    contextBuilder.append(" | Phone: ").append(sup.getPhone());
                }
                contextBuilder.append("\n");
            }
            contextBuilder.append("\n");
        }

        if (!enquiries.isEmpty()) {
            contextBuilder.append("RECENT CUSTOMER ENQUIRIES:\n");
            for (CustomerEnquiry enq : enquiries.stream().limit(15).toList()) {
                contextBuilder.append("- Customer: ").append(enq.getCustomerName())
                        .append(" (").append(enq.getPhone()).append(")")
                        .append(" | Interested In: ").append(enq.getProductsInterested())
                        .append(" | Status: ").append(enq.getStatus())
                        .append(" | Follow-ups: ").append(enq.getFollowUpCount())
                        .append("\n");
            }
            contextBuilder.append("\n");
        }

        StringBuilder historyBuilder = new StringBuilder();
        if (request.history() != null && !request.history().isEmpty()) {
            List<InventoryChatRequestDto.ChatTurn> recentTurns = request.history().size() > 8
                    ? request.history().subList(request.history().size() - 8, request.history().size())
                    : request.history();
            for (InventoryChatRequestDto.ChatTurn turn : recentTurns) {
                if (turn.text() != null && !turn.text().isBlank()) {
                    String speaker = "user".equalsIgnoreCase(turn.role()) ? "Shop Owner" : "AI Assistant";
                    historyBuilder.append(speaker).append(": ").append(turn.text().trim()).append("\n");
                }
            }
        }

        String systemPrompt = """
            You are StockMind AI, an expert inventory, pricing, procurement, and counter-sales assistant for "%s".
            You have direct access to the shop's real-time PostgreSQL database (products, live stock quantities, buying costs, selling prices, MRPs, profit margins, AI product specifications/pitches, suppliers, purchase invoices, and customer enquiries).

            STRICT GUIDELINES:
            1. Ground every answer strictly in the LIVE SHOP DATA provided below. Never invent fake product names (like "Aashirvaad Atta" or "Surf Excel") unless they actually exist in the shop's catalogue below.
            2. Cite exact numbers from the data: exact product names, SKUs, stock quantities, buying cost (₹), selling price (₹), margin percentages, supplier names, and invoice numbers.
            3. If the user asks about product specifications, features, warranty, or a sales pitch for a customer at the counter, use the Pitch and Specs data from the product intelligence matches and catalogue.
            4. Keep responses clear, well-structured, concise, and actionable for an Indian retail business owner (use ₹ for currency).
            5. If the catalogue is empty or a specific product is not in stock, state that clearly and suggest scanning a purchase invoice or adding the product.

            ---
            LIVE SHOP DATA:
            %s
            """.formatted(shop.getName(), contextBuilder.toString());

        String userPrompt = historyBuilder.length() > 0
                ? "Conversation History:\n" + historyBuilder + "\nCurrent Question: " + userQuery
                : userQuery;

        String aiAnswer = null;
        String modelUsed = "Gemini AI";

        try {
            aiAnswer = geminiChatClient.prompt()
                    .system(systemPrompt)
                    .user(userPrompt)
                    .call()
                    .content();
        } catch (Exception geminiEx) {
            log.warn("Gemini inventory chat call failed ({}), falling back to Ollama", geminiEx.getMessage());
            try {
                modelUsed = "Local AI (Ollama)";
                aiAnswer = ollamaChatClient.prompt()
                        .system(systemPrompt)
                        .user(userPrompt)
                        .call()
                        .content();
            } catch (Exception ollamaEx) {
                log.error("Ollama inventory chat fallback also failed: {}", ollamaEx.getMessage());
                modelUsed = "Live Database Summary";
                aiAnswer = buildDeterministicFallbackAnswer(snapshots, invoices, suppliers, outOfStockCount, lowStockCount, totalValuation);
            }
        }

        if (aiAnswer == null || aiAnswer.isBlank()) {
            aiAnswer = buildDeterministicFallbackAnswer(snapshots, invoices, suppliers, outOfStockCount, lowStockCount, totalValuation);
        }

        return new InventoryChatResponseDto(
                aiAnswer.trim(),
                modelUsed,
                snapshots.size(),
                lowStockCount,
                outOfStockCount,
                totalValuation,
                matchedContexts
        );
    }

    private String buildDeterministicFallbackAnswer(
            List<ProductSnapshot> snapshots,
            List<PurchaseInvoice> invoices,
            List<Supplier> suppliers,
            int outOfStockCount,
            int lowStockCount,
            BigDecimal totalValuation
    ) {
        if (snapshots.isEmpty()) {
            return "Your inventory currently has 0 products registered. You can upload a purchase bill in the Invoice Scanner or add products manually in the Products tab.";
        }
        StringBuilder sb = new StringBuilder();
        sb.append("Here is your live inventory snapshot:\n");
        sb.append("- Total Products: ").append(snapshots.size()).append("\n");
        sb.append("- Inventory Valuation: ₹").append(totalValuation).append("\n");
        sb.append("- Low Stock (<10 units): ").append(lowStockCount).append(" | Out of Stock: ").append(outOfStockCount).append("\n");
        sb.append("- Purchase Invoices: ").append(invoices.size()).append(" across ").append(suppliers.size()).append(" suppliers\n\n");
        sb.append("Top items in your catalogue:\n");
        snapshots.stream().limit(5).forEach(s -> sb.append("• ")
                .append(s.product().getName())
                .append(" (Stock: ").append(s.stock().stripTrailingZeros().toPlainString()).append(" ").append(s.product().getUnit()).append(")")
                .append(" — Cost: ₹").append(s.buyingPrice())
                .append(", SP: ₹").append(s.sellingPrice())
                .append(" (Margin: ").append(s.marginPercent()).append("%)\n"));
        return sb.toString();
    }
}

