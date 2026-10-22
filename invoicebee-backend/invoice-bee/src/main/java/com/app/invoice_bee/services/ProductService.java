package com.app.invoice_bee.services;

import com.app.invoice_bee.repositories.InventoryRepository;
import com.app.invoice_bee.repositories.ProductCostHistoryRepository;
import com.app.invoice_bee.repositories.ProductIdentifierRepository;
import com.app.invoice_bee.repositories.ProductPitchRepository;
import com.app.invoice_bee.repositories.ProductPriceHistoryRepository;
import com.app.invoice_bee.repositories.ProductPriceRepository;
import com.app.invoice_bee.repositories.ProductRepository;
import com.app.invoice_bee.repositories.PurchaseInvoiceItemRepository;
import com.app.invoice_bee.repositories.StockMovementRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class ProductService {

    private final ProductRepository productRepository;
    private final InventoryRepository inventoryRepository;
    private final ProductPriceRepository productPriceRepository;
    private final ProductIdentifierRepository productIdentifierRepository;
    private final ProductPitchRepository productPitchRepository;
    private final ProductPriceHistoryRepository productPriceHistoryRepository;
    private final ProductCostHistoryRepository productCostHistoryRepository;
    private final StockMovementRepository stockMovementRepository;
    private final PurchaseInvoiceItemRepository purchaseInvoiceItemRepository;

    public ProductService(
            ProductRepository productRepository,
            InventoryRepository inventoryRepository,
            ProductPriceRepository productPriceRepository,
            ProductIdentifierRepository productIdentifierRepository,
            ProductPitchRepository productPitchRepository,
            ProductPriceHistoryRepository productPriceHistoryRepository,
            ProductCostHistoryRepository productCostHistoryRepository,
            StockMovementRepository stockMovementRepository,
            PurchaseInvoiceItemRepository purchaseInvoiceItemRepository
    ) {
        this.productRepository = productRepository;
        this.inventoryRepository = inventoryRepository;
        this.productPriceRepository = productPriceRepository;
        this.productIdentifierRepository = productIdentifierRepository;
        this.productPitchRepository = productPitchRepository;
        this.productPriceHistoryRepository = productPriceHistoryRepository;
        this.productCostHistoryRepository = productCostHistoryRepository;
        this.stockMovementRepository = stockMovementRepository;
        this.purchaseInvoiceItemRepository = purchaseInvoiceItemRepository;
    }

    @Transactional
    public int deleteProducts(List<UUID> productIds, UUID shopId) {
        if (productIds == null || productIds.isEmpty() || shopId == null) {
            return 0;
        }

        purchaseInvoiceItemRepository.clearProductReferenceForProductIds(productIds);
        stockMovementRepository.deleteByProductIds(productIds);
        inventoryRepository.deleteByProductIds(productIds);
        productPriceRepository.deleteByProductIds(productIds);
        productIdentifierRepository.deleteByProductIds(productIds);
        productPitchRepository.deleteByProductIds(productIds);
        productPriceHistoryRepository.deleteByProductIds(productIds);
        productCostHistoryRepository.deleteByProductIds(productIds);

        return productRepository.deleteByIdsAndShopId(productIds, shopId);
    }
}
