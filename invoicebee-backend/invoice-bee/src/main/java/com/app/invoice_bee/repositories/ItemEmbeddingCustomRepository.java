package com.app.invoice_bee.repositories;

import com.app.invoice_bee.dtos.ProductSearchMatchDto;

import java.util.List;
import java.util.UUID;

public interface ItemEmbeddingCustomRepository {
    void saveEmbedding(UUID productId, UUID descriptionId, String chunkType, String contentChunk, String vectorString, String metadataJson);
    List<ProductSearchMatchDto> searchHybrid(String queryText, String vectorString, int limit);
    List<ProductSearchMatchDto> searchHybridByShopId(UUID shopId, String queryText, String vectorString, int limit);
}
