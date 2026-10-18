package com.app.invoice_bee.services;

import com.app.invoice_bee.dtos.ProductWebIntelligenceDto;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Service
public class ProductIntelligenceService {

    private static final Logger log = LoggerFactory.getLogger(ProductIntelligenceService.class);

    private final RestTemplate restTemplate;
    private final ChatClient chatClient;
    private final String searxngBaseUrl;

    public ProductIntelligenceService(
            ChatClient.Builder chatClientBuilder,
            @Value("${searxng.base-url:http://localhost:8085}") String searxngBaseUrl
    ) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(4000);
        factory.setReadTimeout(6000);
        this.restTemplate = new RestTemplate(factory);
        this.chatClient = chatClientBuilder.build();
        this.searxngBaseUrl = searxngBaseUrl;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class SearxngResponse {
        public String query;
        public List<SearxngResult> results;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class SearxngResult {
        public String title;
        public String url;
        public String content;
        @JsonProperty("engine")
        public String engine;
    }

    public static class AiSynthesisResult {
        public String suggestedName;
        public String brand;
        public String category;
        public BigDecimal estimatedMrp;
        public String hsnCode;
        public String description;
        public String salesPitch;
    }

    public List<ProductWebIntelligenceDto.SearchResultItem> searchWeb(String query) {
        if (query == null || query.isBlank()) {
            return Collections.emptyList();
        }

        try {
            String url = UriComponentsBuilder.fromUriString(searxngBaseUrl)
                    .path("/search")
                    .queryParam("q", query)
                    .queryParam("format", "json")
                    .build()
                    .toUriString();

            ResponseEntity<SearxngResponse> response = restTemplate.getForEntity(url, SearxngResponse.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null && response.getBody().results != null) {
                List<ProductWebIntelligenceDto.SearchResultItem> items = new ArrayList<>();
                for (SearxngResult r : response.getBody().results) {
                    if (items.size() >= 5) break;
                    items.add(new ProductWebIntelligenceDto.SearchResultItem(
                            r.title != null ? r.title : "",
                            r.url != null ? r.url : "",
                            r.content != null ? r.content : ""
                    ));
                }
                return items;
            }
        } catch (Exception ex) {
            log.warn("SearXNG search unavailable or failed: {}", ex.getMessage());
        }

        return Collections.emptyList();
    }

    public ProductWebIntelligenceDto enrichProductWithIntelligence(String query) {
        List<ProductWebIntelligenceDto.SearchResultItem> searchResults = searchWeb(query);

        StringBuilder contextBuilder = new StringBuilder();
        if (!searchResults.isEmpty()) {
            for (ProductWebIntelligenceDto.SearchResultItem res : searchResults) {
                contextBuilder.append("Title: ").append(res.title()).append("\n");
                contextBuilder.append("Snippet: ").append(res.snippet()).append("\n");
                contextBuilder.append("URL: ").append(res.url()).append("\n\n");
            }
        }

        String prompt = """
            You are a retail product intelligence assistant.
            The user is searching for product information for: "%s"

            Web Search Results:
            %s

            Analyze the product name and web results (if provided). Infer:
            1. Clean canonical product name (suggestedName)
            2. Brand name
            3. Category (e.g., Grocery, Home care, Personal care, Snacks, Beverages, Electronics, Hardware, General)
            4. Estimated MRP (maximum retail price in INR, or null if uncertain)
            5. Indian GST HSN code (4-8 digits, or null if uncertain)
            6. Brief product description (description)
            7. 1-2 sentence compelling customer sales pitch/hook for counter sales (salesPitch)
            """.formatted(query, contextBuilder.length() > 0 ? contextBuilder.toString() : "No web results available.");

        AiSynthesisResult synthesis = null;
        try {
            synthesis = chatClient.prompt()
                    .user(prompt)
                    .call()
                    .entity(AiSynthesisResult.class);
        } catch (Exception ex) {
            log.error("AI synthesis failed: {}", ex.getMessage());
        }

        if (synthesis == null) {
            synthesis = new AiSynthesisResult();
            synthesis.suggestedName = query;
            synthesis.description = "Product details retrieved for " + query;
        }

        return new ProductWebIntelligenceDto(
                query,
                synthesis.suggestedName != null ? synthesis.suggestedName : query,
                synthesis.brand,
                synthesis.category != null ? synthesis.category : "General",
                synthesis.estimatedMrp,
                synthesis.hsnCode,
                synthesis.description,
                synthesis.salesPitch,
                searchResults
        );
    }

    public String askQuestion(String productName, String userQuery) {
        String searchQuery = productName + (userQuery != null && !userQuery.isBlank() ? " " + userQuery : "");
        List<ProductWebIntelligenceDto.SearchResultItem> searchResults = searchWeb(searchQuery);

        StringBuilder contextBuilder = new StringBuilder();
        for (ProductWebIntelligenceDto.SearchResultItem res : searchResults) {
            contextBuilder.append("Title: ").append(res.title()).append("\n");
            contextBuilder.append("Snippet: ").append(res.snippet()).append("\n\n");
        }

        String prompt = """
            You are a helpful retail product assistant for an Indian retail shop.
            Product: %s
            User Question / Request: %s

            Web Search Context:
            %s

            Provide a clear, direct, and practical answer (max 2-3 concise paragraphs or bullet points). If the user asks for a sales pitch, provide an engaging 2-sentence pitch for customers at checkout.
            """.formatted(productName, userQuery != null ? userQuery : "Tell me everything about this product and a good sales pitch", contextBuilder.length() > 0 ? contextBuilder.toString() : "No web context found.");

        try {
            return chatClient.prompt().user(prompt).call().content();
        } catch (Exception ex) {
            log.error("AI question answering failed: {}", ex.getMessage());
            return "Unable to retrieve answer right now: " + ex.getMessage();
        }
    }
}
