package com.app.invoice_bee.repositories;

import com.app.invoice_bee.dtos.ProductSearchMatchDto;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public class ItemEmbeddingRepositoryImpl implements ItemEmbeddingCustomRepository {

    private final JdbcTemplate jdbcTemplate;

    public ItemEmbeddingRepositoryImpl(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void saveEmbedding(UUID productId, UUID descriptionId, String chunkType, String contentChunk, String vectorString, String metadataJson) {
        String sql = """
            INSERT INTO item_embeddings (product_id, description_id, chunk_type, content_chunk, embedding, metadata)
            VALUES (?, ?, ?, ?, ?::vector, ?::jsonb)
        """;
        jdbcTemplate.update(sql, productId != null ? productId.toString() : null, descriptionId != null ? descriptionId.toString() : null, chunkType, contentChunk, vectorString, metadataJson != null ? metadataJson : "{}");
    }

    @Override
    public List<ProductSearchMatchDto> searchHybrid(String queryText, String vectorString, int limit) {
        String cleanQuery = queryText != null ? queryText.trim() : "";
        String sql = """
            SELECT 
                p.id AS product_id,
                p.name AS product_name,
                p.brand AS brand,
                p.category AS category,
                p.selling_price AS price,
                e.chunk_type AS chunk_type,
                e.content_chunk AS matched_chunk,
                COALESCE(d.short_pitch, '') AS short_pitch,
                COALESCE(d.full_description, '') AS full_description,
                COALESCE(d.specifications::text, '{}') AS specifications,
                (1 - (e.embedding <=> ?::vector)) AS similarity_score
            FROM item_embeddings e
            LEFT JOIN products p ON e.product_id = p.id
            LEFT JOIN item_descriptions d ON e.description_id = d.id
            WHERE 
                (? = '' OR p.name ILIKE ('%' || ? || '%') OR p.brand ILIKE ('%' || ? || '%') OR e.content_chunk ILIKE ('%' || ? || '%'))
                OR (1 - (e.embedding <=> ?::vector)) > 0.35
            ORDER BY (1 - (e.embedding <=> ?::vector)) DESC
            LIMIT ?
        """;

        return jdbcTemplate.query(
                sql,
                (rs, rowNum) -> new ProductSearchMatchDto(
                        rs.getString("product_id") != null ? UUID.fromString(rs.getString("product_id")) : null,
                        rs.getString("product_name"),
                        rs.getString("brand"),
                        rs.getString("category"),
                        rs.getBigDecimal("price"),
                        rs.getString("chunk_type"),
                        rs.getString("matched_chunk"),
                        rs.getString("short_pitch"),
                        rs.getString("full_description"),
                        rs.getString("specifications"),
                        rs.getDouble("similarity_score")
                ),
                vectorString,
                cleanQuery,
                cleanQuery,
                cleanQuery,
                cleanQuery,
                vectorString,
                vectorString,
                limit
        );
    }

    @Override
    public List<ProductSearchMatchDto> searchHybridByShopId(UUID shopId, String queryText, String vectorString, int limit) {
        if (shopId == null) {
            return searchHybrid(queryText, vectorString, limit);
        }
        String cleanQuery = queryText != null ? queryText.trim() : "";
        String sql = """
            SELECT 
                p.id AS product_id,
                p.name AS product_name,
                p.brand AS brand,
                p.category AS category,
                p.selling_price AS price,
                e.chunk_type AS chunk_type,
                e.content_chunk AS matched_chunk,
                COALESCE(d.short_pitch, '') AS short_pitch,
                COALESCE(d.full_description, '') AS full_description,
                COALESCE(d.specifications::text, '{}') AS specifications,
                (1 - (e.embedding <=> ?::vector)) AS similarity_score
            FROM item_embeddings e
            INNER JOIN products p ON e.product_id = p.id
            LEFT JOIN item_descriptions d ON e.description_id = d.id
            WHERE p.shop_id = ?
              AND (
                (? = '' OR p.name ILIKE ('%' || ? || '%') OR p.brand ILIKE ('%' || ? || '%') OR e.content_chunk ILIKE ('%' || ? || '%'))
                OR (1 - (e.embedding <=> ?::vector)) > 0.30
              )
            ORDER BY (1 - (e.embedding <=> ?::vector)) DESC
            LIMIT ?
        """;

        return jdbcTemplate.query(
                sql,
                (rs, rowNum) -> new ProductSearchMatchDto(
                        rs.getString("product_id") != null ? UUID.fromString(rs.getString("product_id")) : null,
                        rs.getString("product_name"),
                        rs.getString("brand"),
                        rs.getString("category"),
                        rs.getBigDecimal("price"),
                        rs.getString("chunk_type"),
                        rs.getString("matched_chunk"),
                        rs.getString("short_pitch"),
                        rs.getString("full_description"),
                        rs.getString("specifications"),
                        rs.getDouble("similarity_score")
                ),
                vectorString,
                shopId.toString(),
                cleanQuery,
                cleanQuery,
                cleanQuery,
                cleanQuery,
                vectorString,
                vectorString,
                limit
        );
    }
}
