package com.app.invoice_bee.services;

import com.app.invoice_bee.dtos.ScraperRequestDto;
import com.app.invoice_bee.dtos.ScraperResponseDto;
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

import java.util.Optional;

@Service
public class ScraperClientService {

    private static final Logger log = LoggerFactory.getLogger(ScraperClientService.class);

    private final RestTemplate restTemplate;
    private final String scraperServiceUrl;

    public ScraperClientService(
            @Value("${scraper.service.url:http://127.0.0.1:8000/api/v1/scraper}") String scraperServiceUrl
    ) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(30000);
        factory.setReadTimeout(320000);
        this.restTemplate = new RestTemplate(factory);
        this.scraperServiceUrl = scraperServiceUrl;
    }

    public Optional<ScraperResponseDto.ScrapedProductData> scrapeProductUrl(String url) {
        if (url == null || url.isBlank()) {
            return Optional.empty();
        }

        try {
            String endpoint = scraperServiceUrl.replaceAll("/+$", "") + "/product";
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            ScraperRequestDto requestDto = ScraperRequestDto.of(url);
            HttpEntity<ScraperRequestDto> entity = new HttpEntity<>(requestDto, headers);

            ResponseEntity<ScraperResponseDto> response = restTemplate.postForEntity(endpoint, entity, ScraperResponseDto.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null && response.getBody().data() != null) {
                return Optional.of(response.getBody().data());
            }
        } catch (Exception ex) {
            log.error("Scraper service request failed for URL {}: {}", url, ex.getMessage());
        }

        return Optional.empty();
    }
}
