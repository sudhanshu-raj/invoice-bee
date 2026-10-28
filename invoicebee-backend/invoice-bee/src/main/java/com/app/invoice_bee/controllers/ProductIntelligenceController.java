package com.app.invoice_bee.controllers;

import com.app.invoice_bee.dtos.InventoryChatRequestDto;
import com.app.invoice_bee.dtos.InventoryChatResponseDto;
import com.app.invoice_bee.dtos.ProductIngestionResultDto;
import com.app.invoice_bee.dtos.ProductSearchMatchDto;
import com.app.invoice_bee.dtos.ProductWebIntelligenceDto;
import com.app.invoice_bee.entities.ItemDescription;
import com.app.invoice_bee.services.InventoryAssistantService;
import com.app.invoice_bee.services.ProductIntelligenceService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/product-intelligence")
public class ProductIntelligenceController {

    private final ProductIntelligenceService productIntelligenceService;
    private final InventoryAssistantService inventoryAssistantService;

    public ProductIntelligenceController(
            ProductIntelligenceService productIntelligenceService,
            InventoryAssistantService inventoryAssistantService
    ) {
        this.productIntelligenceService = productIntelligenceService;
        this.inventoryAssistantService = inventoryAssistantService;
    }

    @PostMapping("/chat")
    public ResponseEntity<InventoryChatResponseDto> chatWithInventory(
            @RequestBody InventoryChatRequestDto request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        InventoryChatResponseDto response = inventoryAssistantService.chatWithInventory(request, userDetails.getUsername());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/search")
    public ResponseEntity<List<ProductWebIntelligenceDto.SearchResultItem>> searchWeb(
            @RequestParam("q") String query,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        return ResponseEntity.ok(productIntelligenceService.searchWeb(query));
    }

    @GetMapping("/enrich")
    public ResponseEntity<ProductWebIntelligenceDto> enrichProduct(
            @RequestParam("q") String query,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        return ResponseEntity.ok(productIntelligenceService.enrichProductWithIntelligence(query));
    }

    @PostMapping("/ask")
    public ResponseEntity<Map<String, String>> askProductAi(
            @RequestBody Map<String, String> request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        String product = request.getOrDefault("product", "");
        String query = request.getOrDefault("query", "");
        String answer = productIntelligenceService.askQuestion(product, query);
        return ResponseEntity.ok(Map.of("answer", answer));
    }

    @PostMapping("/ingest")
    public ResponseEntity<ProductIngestionResultDto> ingestProduct(
            @RequestBody Map<String, String> request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        String productIdStr = request.get("productId");
        UUID productId = (productIdStr != null && !productIdStr.isBlank()) ? UUID.fromString(productIdStr) : null;
        String query = request.get("query");
        ProductIngestionResultDto result = productIntelligenceService.ingestProductIntelligence(productId, query);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/hybrid-search")
    public ResponseEntity<List<ProductSearchMatchDto>> hybridSearch(
            @RequestParam("q") String query,
            @RequestParam(value = "limit", defaultValue = "10") int limit,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        List<ProductSearchMatchDto> results = productIntelligenceService.searchHybrid(query, limit);
        return ResponseEntity.ok(results);
    }

    @GetMapping("/product/{productId}/description")
    public ResponseEntity<ItemDescription> getProductDescription(
            @PathVariable("productId") UUID productId,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        return productIntelligenceService.getProductDescription(productId)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
