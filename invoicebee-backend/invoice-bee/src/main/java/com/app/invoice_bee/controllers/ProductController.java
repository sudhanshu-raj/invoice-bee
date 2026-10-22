package com.app.invoice_bee.controllers;

import com.app.invoice_bee.dtos.ProductDetailDto;
import com.app.invoice_bee.entities.IdentifierType;
import com.app.invoice_bee.entities.Inventory;
import com.app.invoice_bee.entities.Product;
import com.app.invoice_bee.entities.ProductIdentifier;
import com.app.invoice_bee.entities.ProductPitch;
import com.app.invoice_bee.entities.ProductPrice;
import com.app.invoice_bee.entities.Shop;
import com.app.invoice_bee.entities.User;
import com.app.invoice_bee.repositories.InventoryRepository;
import com.app.invoice_bee.repositories.ProductIdentifierRepository;
import com.app.invoice_bee.repositories.ProductPitchRepository;
import com.app.invoice_bee.repositories.ProductPriceRepository;
import com.app.invoice_bee.repositories.ProductRepository;
import com.app.invoice_bee.repositories.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import com.app.invoice_bee.services.ProductService;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
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
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    private final ProductRepository productRepository;
    private final ProductPriceRepository productPriceRepository;
    private final InventoryRepository inventoryRepository;
    private final ProductIdentifierRepository productIdentifierRepository;
    private final ProductPitchRepository productPitchRepository;
    private final UserRepository userRepository;
    private final ProductService productService;

    public ProductController(
            ProductRepository productRepository,
            ProductPriceRepository productPriceRepository,
            InventoryRepository inventoryRepository,
            ProductIdentifierRepository productIdentifierRepository,
            ProductPitchRepository productPitchRepository,
            UserRepository userRepository,
            ProductService productService
    ) {
        this.productRepository = productRepository;
        this.productPriceRepository = productPriceRepository;
        this.inventoryRepository = inventoryRepository;
        this.productIdentifierRepository = productIdentifierRepository;
        this.productPitchRepository = productPitchRepository;
        this.userRepository = userRepository;
        this.productService = productService;
    }

    @GetMapping
    public ResponseEntity<List<ProductDetailDto>> getShopProducts(@AuthenticationPrincipal UserDetails userDetails) {
        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        Shop shop = user.getShop();
        if (shop == null) {
            return ResponseEntity.ok(List.of());
        }

        List<Product> products = productRepository.findByShopId(shop.getId());
        List<ProductDetailDto> dtos = new ArrayList<>();
        for (Product product : products) {
            dtos.add(mapToDetailDto(product));
        }
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/qr/{token}")
    public ResponseEntity<ProductDetailDto> getProductByQrToken(
            @PathVariable("token") String token,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        Optional<Product> foundProduct = Optional.empty();
        try {
            UUID uuid = UUID.fromString(token.trim());
            foundProduct = productRepository.findByQrToken(uuid);
            if (foundProduct.isEmpty()) {
                foundProduct = productRepository.findById(uuid);
            }
        } catch (IllegalArgumentException ignored) {
        }

        if (foundProduct.isEmpty()) {
            User user = userRepository.findByEmail(userDetails.getUsername()).orElse(null);
            if (user != null && user.getShop() != null) {
                foundProduct = productRepository.findByShopIdAndSku(user.getShop().getId(), token.trim());
            }
        }

        Product product = foundProduct.orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found for QR token: " + token));

        return ResponseEntity.ok(mapToDetailDto(product));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProductDetailDto> getProductById(
            @PathVariable("id") UUID id,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found with id: " + id));

        return ResponseEntity.ok(mapToDetailDto(product));
    }

    @PostMapping
    public ResponseEntity<ProductDetailDto> createProduct(
            @RequestBody Map<String, Object> req,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        Shop shop = user.getShop();
        if (shop == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Shop profile required");
        }

        String name = (String) req.get("name");
        if (name == null || name.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Product name is required");
        }

        String sku = (String) req.get("sku");
        if (sku == null || sku.isBlank()) {
            sku = "SKU-" + System.currentTimeMillis();
        }

        Optional<Product> existing = productRepository.findByShopIdAndSku(shop.getId(), sku);
        if (existing.isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Product with SKU '" + sku + "' already exists");
        }

        BigDecimal sellingPrice = req.get("sellingPrice") != null
                ? new BigDecimal(req.get("sellingPrice").toString())
                : BigDecimal.ZERO;
        BigDecimal mrp = req.get("mrp") != null && !req.get("mrp").toString().isBlank()
                ? new BigDecimal(req.get("mrp").toString())
                : null;
        BigDecimal buyingPrice = req.get("buyingPrice") != null && !req.get("buyingPrice").toString().isBlank()
                ? new BigDecimal(req.get("buyingPrice").toString())
                : BigDecimal.ZERO;
        BigDecimal discountPrice = req.get("discountPrice") != null && !req.get("discountPrice").toString().isBlank()
                ? new BigDecimal(req.get("discountPrice").toString())
                : null;
        BigDecimal initialStock = req.get("stock") != null && !req.get("stock").toString().isBlank()
                ? new BigDecimal(req.get("stock").toString())
                : BigDecimal.ZERO;

        OffsetDateTime now = OffsetDateTime.now();
        Product product = new Product();
        product.setShop(shop);
        product.setName(name.trim());
        product.setSku(sku.trim());
        product.setBrand((String) req.get("brand"));
        product.setModel((String) req.get("model"));
        product.setCategory((String) req.get("category"));
        product.setUnit(req.get("unit") != null ? req.get("unit").toString() : "PIECE");
        product.setSellingPrice(sellingPrice);
        product.setMrp(mrp);
        product.setLastPurchaseCost(buyingPrice);
        product.setQrToken(UUID.randomUUID());
        product.setActive(true);
        product.setCreatedAt(now);
        product.setUpdatedAt(now);

        Product savedProduct = productRepository.save(product);

        ProductPrice price = new ProductPrice();
        price.setShopId(shop.getId());
        price.setProduct(savedProduct);
        price.setBuyingPrice(buyingPrice);
        price.setSellingPrice(sellingPrice);
        price.setMrp(mrp);
        price.setDiscountPrice(discountPrice);
        price.setCreatedAt(now);
        price.setUpdatedAt(now);
        productPriceRepository.save(price);

        Inventory inv = new Inventory();
        inv.setProduct(savedProduct);
        inv.setQuantityOnHand(initialStock);
        inv.setAverageUnitCost(buyingPrice);
        inv.setUpdatedAt(now);
        inventoryRepository.save(inv);

        String hsn = (String) req.get("hsnSac");
        if (hsn != null && !hsn.isBlank()) {
            ProductIdentifier pi = new ProductIdentifier();
            pi.setProduct(savedProduct);
            pi.setIdentifierType(IdentifierType.HSN);
            pi.setIdentifierValue(hsn.trim());
            productIdentifierRepository.save(pi);
        }

        String pitch = (String) req.get("pitchHook");
        if (pitch != null && !pitch.isBlank()) {
            ProductPitch pp = new ProductPitch();
            pp.setProduct(savedProduct);
            pp.setPitchText(pitch.trim());
            productPitchRepository.save(pp);
        }

        return ResponseEntity.status(HttpStatus.CREATED).body(mapToDetailDto(savedProduct));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> deleteProduct(
            @PathVariable("id") UUID id,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        Shop shop = user.getShop();
        if (shop == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Shop required");
        }

        int deleted = productService.deleteProducts(List.of(id), shop.getId());
        if (deleted == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found or already deleted");
        }
        return ResponseEntity.ok(Map.of("deleted", deleted, "id", id));
    }

    @PostMapping("/batch-delete")
    public ResponseEntity<Map<String, Object>> batchDeleteProducts(
            @RequestBody Map<String, List<UUID>> request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        Shop shop = user.getShop();
        if (shop == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Shop required");
        }

        List<UUID> productIds = request.get("productIds");
        if (productIds == null || productIds.isEmpty()) {
            return ResponseEntity.ok(Map.of("deleted", 0));
        }

        int deleted = productService.deleteProducts(productIds, shop.getId());
        return ResponseEntity.ok(Map.of("deleted", deleted));
    }

    private ProductDetailDto mapToDetailDto(Product product) {
        Optional<ProductPrice> priceOpt = productPriceRepository.findByProductId(product.getId());
        BigDecimal buyingPrice = priceOpt.map(ProductPrice::getBuyingPrice).orElse(product.getLastPurchaseCost());
        BigDecimal discountPrice = priceOpt.map(ProductPrice::getDiscountPrice).orElse(null);
        BigDecimal mrp = priceOpt.map(ProductPrice::getMrp).orElse(product.getMrp());
        BigDecimal sellingPrice = priceOpt.map(ProductPrice::getSellingPrice).orElse(product.getSellingPrice());

        BigDecimal stock = inventoryRepository.findByProductId(product.getId())
                .map(Inventory::getQuantityOnHand)
                .orElse(BigDecimal.ZERO);

        String hsn = productIdentifierRepository.findByProductId(product.getId()).stream()
                .filter(id -> id.getIdentifierType() == IdentifierType.HSN)
                .map(ProductIdentifier::getIdentifierValue)
                .findFirst()
                .orElse(null);

        String pitch = productPitchRepository.findByProductId(product.getId()).stream()
                .map(ProductPitch::getPitchText)
                .findFirst()
                .orElse(null);

        return new ProductDetailDto(
                product.getId(),
                product.getName(),
                product.getSku(),
                product.getCategory(),
                product.getUnit(),
                product.getBrand(),
                product.getModel(),
                sellingPrice,
                discountPrice,
                mrp,
                buyingPrice,
                product.getLastPurchaseCost(),
                stock,
                product.getQrToken(),
                hsn,
                pitch,
                product.getUpdatedAt()
        );
    }
}
