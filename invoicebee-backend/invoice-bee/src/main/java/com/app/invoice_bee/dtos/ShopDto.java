package com.app.invoice_bee.dtos;

import java.util.UUID;

public class ShopDto {

    private UUID id;
    private String name;
    private String currency;
    private String email;
    private String phone;
    private String gstin;
    private String address;

    public ShopDto() {
    }

    public ShopDto(UUID id, String name, String currency, String email, String phone, String gstin, String address) {
        this.id = id;
        this.name = name;
        this.currency = currency;
        this.email = email;
        this.phone = phone;
        this.gstin = gstin;
        this.address = address;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getGstin() {
        return gstin;
    }

    public void setGstin(String gstin) {
        this.gstin = gstin;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }
}
