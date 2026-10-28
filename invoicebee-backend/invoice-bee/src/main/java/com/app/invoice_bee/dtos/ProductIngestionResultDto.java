package com.app.invoice_bee.dtos;

import java.util.Map;
import java.util.UUID;

public record ProductIngestionResultDto(
        UUID productId,
        UUID descriptionId,
        String sourceUrl,
        int candidateUrlsAttempted,
        String shortPitch,
        String fullDescription,
        Map<String, Object> specifications,
        int embeddingsCreated,
        String status
) {}
