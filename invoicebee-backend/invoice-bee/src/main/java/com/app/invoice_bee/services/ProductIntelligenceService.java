package com.app.invoice_bee.services;

import com.app.invoice_bee.dtos.ProductIngestionResultDto;
import com.app.invoice_bee.dtos.ProductSearchMatchDto;
import com.app.invoice_bee.dtos.ProductWebIntelligenceDto;
import com.app.invoice_bee.dtos.ScraperResponseDto;
import com.app.invoice_bee.entities.ItemDescription;
import com.app.invoice_bee.entities.Product;
import com.app.invoice_bee.repositories.ItemDescriptionRepository;
import com.app.invoice_bee.repositories.ItemEmbeddingRepository;
import com.app.invoice_bee.repositories.ProductRepository;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class ProductIntelligenceService {

    private static final Logger log = LoggerFactory.getLogger(ProductIntelligenceService.class);

    private final RestTemplate restTemplate;
    private final ChatClient chatClient;
    private final String searxngBaseUrl;
    private final EmbeddingService embeddingService;
    private final ScraperClientService scraperClientService;
    private final ProductRepository productRepository;
    private final ItemDescriptionRepository itemDescriptionRepository;
    private final ItemEmbeddingRepository itemEmbeddingRepository;
    private final ObjectMapper objectMapper;

    public ProductIntelligenceService(
            ChatClient.Builder chatClientBuilder,
            @Value("${searxng.base-url:http://localhost:8085}") String searxngBaseUrl,
            EmbeddingService embeddingService,
            ScraperClientService scraperClientService,
            ProductRepository productRepository,
            ItemDescriptionRepository itemDescriptionRepository,
            ItemEmbeddingRepository itemEmbeddingRepository,
            @Autowired(required = false) ObjectMapper objectMapper
    ) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(4000);
        factory.setReadTimeout(6000);
        this.restTemplate = new RestTemplate(factory);
        this.chatClient = chatClientBuilder.build();
        this.searxngBaseUrl = searxngBaseUrl;
        this.embeddingService = embeddingService;
        this.scraperClientService = scraperClientService;
        this.productRepository = productRepository;
        this.itemDescriptionRepository = itemDescriptionRepository;
        this.itemEmbeddingRepository = itemEmbeddingRepository;
        this.objectMapper = objectMapper != null ? objectMapper : new ObjectMapper();
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

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class ValidationResult {
        public boolean valid;
        public String reason;
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
                    if (items.size() >= 10) break;
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

    public List<String> selectCandidateUrls(String productName, String brand, String model, List<ProductWebIntelligenceDto.SearchResultItem> searchResults) {
        if (searchResults == null || searchResults.isEmpty()) {
            return Collections.emptyList();
        }

        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < searchResults.size(); i++) {
            ProductWebIntelligenceDto.SearchResultItem item = searchResults.get(i);
            sb.append("[").append(i + 1).append("] Title: ").append(item.title()).append("\n");
            sb.append("URL: ").append(item.url()).append("\n");
            sb.append("Snippet: ").append(item.snippet()).append("\n\n");
        }

        String prompt = """
            Target Product Details:
            - Brand: %s
            - Model: %s
            - Name: %s

            Candidate Search Results:
            %s

            Task:
            Evaluate the search results and select up to 3 candidate URLs to crawl for exhaustive product content.
            Strict Ranking Priority:
            1. Official brand or manufacturer product webpage for this exact product (highest priority).
            2. Major Indian e-commerce / marketplace listings (e.g., Amazon India, Flipkart, Reliance Digital, Croma, Tata CLiQ).
            Filter out forum threads, user reviews, news blogs, and unrelated products.

            Output strictly a valid JSON array of up to 3 URLs in order of priority, with no surrounding formatting:
            ["https://...", "https://..."]
            """.formatted(
                brand != null ? brand : "",
                model != null ? model : "",
                productName != null ? productName : "",
                sb.toString()
        );

        try {
            String rawJson = chatClient.prompt().user(prompt).call().content();
            if (rawJson != null) {
                String clean = rawJson.replaceAll("(?s)```(?:json)?", "").replaceAll("```", "").trim();
                List<String> urls = objectMapper.readValue(clean, new TypeReference<List<String>>() {});
                if (urls != null && !urls.isEmpty()) {
                    return urls.stream().filter(u -> u != null && (u.startsWith("http://") || u.startsWith("https://"))).limit(3).toList();
                }
            }
        } catch (Exception ex) {
            log.warn("URL prioritization via LLM failed: {}", ex.getMessage());
        }

        return searchResults.stream().map(ProductWebIntelligenceDto.SearchResultItem::url).limit(3).toList();
    }

    public boolean validateScrapedContent(String brand, String model, String productName, ScraperResponseDto.ScrapedProductData data) {
        if (data == null) {
            return false;
        }

        if (data.shortPitch() == null || data.shortPitch().isBlank()) {
            return false;
        }

        if (data.fullDescription() == null || data.fullDescription().isBlank() || data.fullDescription().length() < 30) {
            return false;
        }

        if (data.specifications() == null || data.specifications().isEmpty()) {
            return false;
        }

        String specsText;
        try {
            specsText = objectMapper.writeValueAsString(data.specifications());
        } catch (Exception e) {
            specsText = "";
        }

        String prompt = """
            Product Target:
            - Brand: %s
            - Model: %s
            - Name: %s

            Scraped Data:
            - Pitch: %s
            - Description: %s
            - Specifications: %s

            Task:
            Verify if the scraped content accurately corresponds to the target product or product line, and is not a completely wrong product or empty listing.
            Respond strictly in valid JSON:
            {"valid": true, "reason": "Accurate product specs and details"}
            or
            {"valid": false, "reason": "Mismatch or empty specifications"}
            """.formatted(
                brand != null ? brand : "",
                model != null ? model : "",
                productName != null ? productName : "",
                data.shortPitch(),
                data.fullDescription().length() > 600 ? data.fullDescription().substring(0, 600) : data.fullDescription(),
                specsText.length() > 600 ? specsText.substring(0, 600) : specsText
        );

        try {
            ValidationResult res = chatClient.prompt().user(prompt).call().entity(ValidationResult.class);
            if (res != null) {
                return res.valid;
            }
        } catch (Exception ex) {
            log.warn("LLM validation check encountered error: {}", ex.getMessage());
        }

        String combined = (data.shortPitch() + " " + data.fullDescription() + " " + specsText).toLowerCase();
        if (brand != null && !brand.isBlank() && !combined.contains(brand.toLowerCase())) {
            return false;
        }
        if (model != null && !model.isBlank() && !combined.contains(model.toLowerCase())) {
            return false;
        }

        return true;
    }

    @Transactional
    public ProductIngestionResultDto ingestProductIntelligence(UUID productId, String customQuery) {
        Product product = null;
        if (productId != null) {
            product = productRepository.findById(productId).orElse(null);
        }

        if (product == null) {
            return new ProductIngestionResultDto(productId, null, null, 0, null, null, Collections.emptyMap(), 0, "FAILED_PRODUCT_NOT_FOUND");
        }

        String brand = product != null ? product.getBrand() : "";
        String model = product != null ? product.getModel() : "";
        String name = product != null ? product.getName() : (customQuery != null ? customQuery : "");

        String searchQuery = customQuery != null && !customQuery.isBlank()
                ? customQuery
                : ((brand != null ? brand + " " : "") + name + (model != null && !model.isBlank() ? " " + model : "")).trim();

        List<ProductWebIntelligenceDto.SearchResultItem> searchResults = searchWeb(searchQuery);
        List<String> candidateUrls = selectCandidateUrls(name, brand, model, searchResults);

        ScraperResponseDto.ScrapedProductData chosenData = null;
        String chosenUrl = null;
        int attemptedCount = 0;

        for (String candidateUrl : candidateUrls) {
            attemptedCount++;
            Optional<ScraperResponseDto.ScrapedProductData> scrapedOpt = scraperClientService.scrapeProductUrl(candidateUrl);
            if (scrapedOpt.isPresent()) {
                ScraperResponseDto.ScrapedProductData candidateData = scrapedOpt.get();
                boolean isValid = validateScrapedContent(brand, model, name, candidateData);
                if (isValid) {
                    chosenData = candidateData;
                    chosenUrl = candidateUrl;
                    break;
                } else {
                    log.info("Candidate URL {} failed validation, continuing to next URL", candidateUrl);
                }
            }
        }

        if (chosenData == null) {
            return new ProductIngestionResultDto(
                    productId,
                    null,
                    null,
                    attemptedCount,
                    null,
                    null,
                    Collections.emptyMap(),
                    0,
                    "FAILED_NO_VALID_CONTENT"
            );
        }

        String specsJson;
        try {
            specsJson = objectMapper.writeValueAsString(chosenData.specifications());
        } catch (Exception e) {
            specsJson = "{}";
        }

        List<String> topCandidateUrls = candidateUrls != null ? candidateUrls.stream().limit(5).toList() : Collections.emptyList();
        String sourceUrlsJson;
        try {
            sourceUrlsJson = objectMapper.writeValueAsString(topCandidateUrls);
        } catch (Exception e) {
            sourceUrlsJson = "[]";
        }

        String payloadToHash = chosenData.shortPitch() + chosenData.fullDescription() + specsJson;
        String rawHash = computeSha256(payloadToHash);

        ItemDescription description = itemDescriptionRepository.findTopByProductIdOrderByCreatedAtDesc(productId).orElse(null);
        if (description == null) {
            description = new ItemDescription();
            description.setProduct(product);
            description.setCreatedAt(OffsetDateTime.now());
        }

        description.setShortPitch(chosenData.shortPitch());
        description.setFullDescription(chosenData.fullDescription());
        description.setSpecifications(specsJson);
        description.setSourceUrl(chosenUrl);
        description.setSourceUrls(sourceUrlsJson);
        description.setRawHash(rawHash);
        description.setUpdatedAt(OffsetDateTime.now());

        ItemDescription savedDescription = itemDescriptionRepository.saveAndFlush(description);

        if (productId != null) {
            itemEmbeddingRepository.deleteByProductId(productId);
        }

        List<ChunkPayload> chunks = List.of(
                new ChunkPayload("pitch", chosenData.shortPitch()),
                new ChunkPayload("specs", formatSpecificationsChunk(chosenData.specifications())),
                new ChunkPayload("description", chosenData.fullDescription())
        );

        int embeddingsCreated = 0;
        for (ChunkPayload chunk : chunks) {
            if (chunk.content() != null && !chunk.content().isBlank()) {
                List<Double> vector = embeddingService.generateEmbedding(chunk.content());
                String vectorLiteral = embeddingService.formatVectorLiteral(vector);
                itemEmbeddingRepository.saveEmbedding(
                        productId,
                        savedDescription.getId(),
                        chunk.type(),
                        chunk.content(),
                        vectorLiteral,
                        "{}"
                );
                embeddingsCreated++;
            }
        }

        return new ProductIngestionResultDto(
                productId,
                savedDescription.getId(),
                chosenUrl,
                attemptedCount,
                savedDescription.getShortPitch(),
                savedDescription.getFullDescription(),
                chosenData.specifications(),
                embeddingsCreated,
                "SUCCESS"
        );
    }

    public List<ProductSearchMatchDto> searchHybrid(String query, int limit) {
        int boundedLimit = Math.max(1, Math.min(limit, 50));
        List<Double> queryVector = embeddingService.generateEmbedding(query);
        String vectorLiteral = embeddingService.formatVectorLiteral(queryVector);
        return itemEmbeddingRepository.searchHybrid(query, vectorLiteral, boundedLimit);
    }

    public Optional<ItemDescription> getProductDescription(UUID productId) {
        if (productId == null) {
            return Optional.empty();
        }
        return itemDescriptionRepository.findTopByProductIdOrderByCreatedAtDesc(productId);
    }

    private record ChunkPayload(String type, String content) {}

    private String formatSpecificationsChunk(Map<String, Object> specs) {
        if (specs == null || specs.isEmpty()) {
            return "";
        }
        StringBuilder sb = new StringBuilder();
        specs.forEach((k, v) -> sb.append(k).append(": ").append(v).append("; "));
        return sb.toString();
    }

    private String computeSha256(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hashBytes);
        } catch (Exception e) {
            return Integer.toHexString(input.hashCode());
        }
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
