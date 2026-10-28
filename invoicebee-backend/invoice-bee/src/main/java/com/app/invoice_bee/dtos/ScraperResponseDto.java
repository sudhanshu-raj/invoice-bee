package com.app.invoice_bee.dtos;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.Map;

@JsonIgnoreProperties(ignoreUnknown = true)
public record ScraperResponseDto(
        @JsonProperty("status") String status,
        @JsonProperty("url") String url,
        @JsonProperty("data") ScrapedProductData data
) {
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ScrapedProductData(
            @JsonProperty("short_pitch") String shortPitch,
            @JsonProperty("full_description") String fullDescription,
            @JsonProperty("specifications") Map<String, Object> specifications
    ) {}
}
