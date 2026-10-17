package com.app.invoice_bee.dtos;

import jakarta.validation.constraints.NotBlank;

public class CreateShopRequest {

    @NotBlank(message = "Shop name is required")
    private String name;

    private String currency = "INR";
    private String email;
    private String phone;
    private String gstin;
    private String address;

    public CreateShopRequest() {
    }

    public CreateShopRequest(String name, String currency, String email, String phone, String gstin, String address) {
        this.name = name;
        this.currency = currency;
        this.email = email;
        this.phone = phone;
        this.gstin = gstin;
        this.address = address;
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
