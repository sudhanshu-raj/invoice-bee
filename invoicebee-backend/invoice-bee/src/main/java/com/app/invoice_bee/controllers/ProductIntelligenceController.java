package com.app.invoice_bee.controllers;

import com.app.invoice_bee.dtos.ProductWebIntelligenceDto;
import com.app.invoice_bee.services.ProductIntelligenceService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/product-intelligence")
public class ProductIntelligenceController {

    private final ProductIntelligenceService productIntelligenceService;

    public ProductIntelligenceController(ProductIntelligenceService productIntelligenceService) {
        this.productIntelligenceService = productIntelligenceService;
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
}
