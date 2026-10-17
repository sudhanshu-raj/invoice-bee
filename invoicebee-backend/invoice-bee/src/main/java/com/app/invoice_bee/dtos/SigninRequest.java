package com.app.invoice_bee.dtos;

import jakarta.validation.constraints.NotBlank;

public class SigninRequest {

    @NotBlank(message = "Email or phone is required")
    private String email;

    @NotBlank(message = "Password is required")
    private String password;

    public SigninRequest() {
    }

    public SigninRequest(String email, String password) {
        this.email = email;
        this.password = password;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }
}
