package com.app.invoice_bee.services;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

@Service
public class EmbeddingService {

    private static final Logger log = LoggerFactory.getLogger(EmbeddingService.class);

    private final RestTemplate restTemplate;
    private final String ollamaBaseUrl;
    private final String embeddingModel;
    private final int targetDimension;

    public EmbeddingService(
            @Value("${spring.ai.ollama.base-url:http://localhost:11434}") String ollamaBaseUrl,
            @Value("${ollama.embedding.model:qwen3-embedding:latest}") String embeddingModel,
            @Value("${ollama.embedding.dimension:1024}") int targetDimension
    ) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(8000);
        factory.setReadTimeout(30000);
        this.restTemplate = new RestTemplate(factory);
        this.ollamaBaseUrl = ollamaBaseUrl;
        this.embeddingModel = embeddingModel;
        this.targetDimension = targetDimension;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private static class OllamaEmbedResponse {
        @JsonProperty("embeddings")
        public List<List<Double>> embeddings;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private static class OllamaSingleEmbedResponse {
        @JsonProperty("embedding")
        public List<Double> embedding;
    }

    public List<Double> generateEmbedding(String text) {
        if (text == null || text.isBlank()) {
            return Collections.nCopies(targetDimension, 0.0);
        }

        try {
            String embedUrl = ollamaBaseUrl.replaceAll("/+$", "") + "/api/embed";
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            Map<String, Object> payload = Map.of(
                    "model", embeddingModel,
                    "input", text
            );

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);
            ResponseEntity<OllamaEmbedResponse> response = restTemplate.postForEntity(embedUrl, request, OllamaEmbedResponse.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null && response.getBody().embeddings != null && !response.getBody().embeddings.isEmpty()) {
                return normalizeDimension(response.getBody().embeddings.get(0));
            }
        } catch (Exception ex) {
            log.warn("Ollama /api/embed call failed, attempting fallback to /api/embeddings: {}", ex.getMessage());
            try {
                String legacyUrl = ollamaBaseUrl.replaceAll("/+$", "") + "/api/embeddings";
                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);

                Map<String, Object> payload = Map.of(
                        "model", embeddingModel,
                        "prompt", text
                );

                HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);
                ResponseEntity<OllamaSingleEmbedResponse> response = restTemplate.postForEntity(legacyUrl, request, OllamaSingleEmbedResponse.class);

                if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null && response.getBody().embedding != null) {
                    return normalizeDimension(response.getBody().embedding);
                }
            } catch (Exception fallbackEx) {
                log.error("Ollama legacy /api/embeddings failed: {}", fallbackEx.getMessage());
            }
        }

        return Collections.nCopies(targetDimension, 0.0);
    }

    public String formatVectorLiteral(List<Double> vector) {
        List<Double> normalized = normalizeDimension(vector);
        StringBuilder sb = new StringBuilder();
        sb.append("[");
        for (int i = 0; i < normalized.size(); i++) {
            sb.append(normalized.get(i));
            if (i < normalized.size() - 1) {
                sb.append(",");
            }
        }
        sb.append("]");
        return sb.toString();
    }

    private List<Double> normalizeDimension(List<Double> original) {
        if (original == null) {
            return Collections.nCopies(targetDimension, 0.0);
        }
        if (original.size() == targetDimension) {
            return original;
        }
        List<Double> adjusted = new ArrayList<>(original);
        if (adjusted.size() > targetDimension) {
            return adjusted.subList(0, targetDimension);
        }
        while (adjusted.size() < targetDimension) {
            adjusted.add(0.0);
        }
        return adjusted;
    }
}
