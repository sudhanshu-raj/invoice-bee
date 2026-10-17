package com.app.invoice_bee.entities;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(
        name = "products",
        uniqueConstraints = {
                @UniqueConstraint(name = "uq_products_shop_sku", columnNames = {"shop_id", "sku"}),
                @UniqueConstraint(name = "uq_products_qr_token", columnNames = {"qr_token"})
        }
)
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "shop_id", nullable = false)
    private Shop shop;

    @Column(name = "sku", length = 80, nullable = false)
    private String sku;

    @Column(name = "name", length = 200, nullable = false)
    private String name;

    @Column(name = "brand", length = 100)
    private String brand;

    @Column(name = "model", length = 100)
    private String model;

    @Column(name = "category", length = 100)
    private String category;

    @Column(name = "unit", length = 20, nullable = false)
    private String unit = "PIECE";

    @Column(name = "mrp", precision = 12, scale = 2)
    private BigDecimal mrp;

    @Column(name = "selling_price", precision = 12, scale = 2, nullable = false)
    private BigDecimal sellingPrice;

    @Column(name = "last_purchase_cost", precision = 12, scale = 2)
    private BigDecimal lastPurchaseCost;

    @Column(name = "qr_token", nullable = false, unique = true)
    private UUID qrToken;

    @Column(name = "active", nullable = false)
    private Boolean active = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @OneToOne(mappedBy = "product", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private Inventory inventory;

    @OneToMany(mappedBy = "product")
    private List<PurchaseInvoiceItem> purchaseInvoiceItems = new ArrayList<PurchaseInvoiceItem>();

    @OneToMany(mappedBy = "product")
    private List<StockMovement> stockMovements = new ArrayList<>();

    @OneToMany(mappedBy = "product")
    private List<ProductPriceHistory> priceHistories = new ArrayList<>();

    @OneToMany(mappedBy = "product")
    private List<ProductCostHistory> costHistories = new ArrayList<>();

    @OneToMany(mappedBy = "product")
    private List<ProductIdentifier> identifiers = new ArrayList<>();

    @OneToMany(mappedBy = "product")
    private List<ProductPitch> pitches = new ArrayList<>();

    @OneToOne(mappedBy = "product", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private ProductPrice price;

    public Product() {
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public Shop getShop() {
        return shop;
    }

    public void setShop(Shop shop) {
        this.shop = shop;
    }

    public String getSku() {
        return sku;
    }

    public void setSku(String sku) {
        this.sku = sku;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getBrand() {
        return brand;
    }

    public void setBrand(String brand) {
        this.brand = brand;
    }

    public String getModel() {
        return model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getUnit() {
        return unit;
    }

    public void setUnit(String unit) {
        this.unit = unit;
    }

    public BigDecimal getMrp() {
        return mrp;
    }

    public void setMrp(BigDecimal mrp) {
        this.mrp = mrp;
    }

    public BigDecimal getSellingPrice() {
        return sellingPrice;
    }

    public void setSellingPrice(BigDecimal sellingPrice) {
        this.sellingPrice = sellingPrice;
    }

    public BigDecimal getLastPurchaseCost() {
        return lastPurchaseCost;
    }

    public void setLastPurchaseCost(BigDecimal lastPurchaseCost) {
        this.lastPurchaseCost = lastPurchaseCost;
    }

    public UUID getQrToken() {
        return qrToken;
    }

    public void setQrToken(UUID qrToken) {
        this.qrToken = qrToken;
    }

    public Boolean getActive() {
        return active;
    }

    public void setActive(Boolean active) {
        this.active = active;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(OffsetDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public Inventory getInventory() {
        return inventory;
    }

    public void setInventory(Inventory inventory) {
        this.inventory = inventory;
    }

    public List<PurchaseInvoiceItem> getPurchaseInvoiceItems() {
        return purchaseInvoiceItems;
    }

    public void setPurchaseInvoiceItems(List<PurchaseInvoiceItem> purchaseInvoiceItems) {
        this.purchaseInvoiceItems = purchaseInvoiceItems;
    }

    public List<StockMovement> getStockMovements() {
        return stockMovements;
    }

    public void setStockMovements(List<StockMovement> stockMovements) {
        this.stockMovements = stockMovements;
    }

    public List<ProductPriceHistory> getPriceHistories() {
        return priceHistories;
    }

    public void setPriceHistories(List<ProductPriceHistory> priceHistories) {
        this.priceHistories = priceHistories;
    }

    public List<ProductCostHistory> getCostHistories() {
        return costHistories;
    }

    public void setCostHistories(List<ProductCostHistory> costHistories) {
        this.costHistories = costHistories;
    }

    public List<ProductIdentifier> getIdentifiers() {
        return identifiers;
    }

    public void setIdentifiers(List<ProductIdentifier> identifiers) {
        this.identifiers = identifiers;
    }

    public List<ProductPitch> getPitches() {
        return pitches;
    }

    public void setPitches(List<ProductPitch> pitches) {
        this.pitches = pitches;
    }

    public ProductPrice getPrice() {
        return price;
    }

    public void setPrice(ProductPrice price) {
        this.price = price;
    }
}
