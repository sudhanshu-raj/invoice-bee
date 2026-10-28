package com.app.invoice_bee.dtos;

import com.fasterxml.jackson.annotation.JsonProperty;

public record ScraperRequestDto(
        @JsonProperty("url") String url,
        @JsonProperty("delay") Double delay,
        @JsonProperty("wait_for") String waitFor,
        @JsonProperty("custom_instruction") String customInstruction,
        @JsonProperty("bypass_cache") Boolean bypassCache
) {
    public static ScraperRequestDto of(String url) {
        return new ScraperRequestDto(url, 2.5, null, null, true);
    }
}
