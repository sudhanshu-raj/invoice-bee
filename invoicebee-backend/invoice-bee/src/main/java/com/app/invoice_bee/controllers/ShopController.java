package com.app.invoice_bee.controllers;

import com.app.invoice_bee.dtos.AuthResponse;
import com.app.invoice_bee.dtos.CreateShopRequest;
import com.app.invoice_bee.dtos.ShopDto;
import com.app.invoice_bee.services.ShopService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/shops")
public class ShopController {

    private final ShopService shopService;

    public ShopController(ShopService shopService) {
        this.shopService = shopService;
    }

    @PostMapping
    public ResponseEntity<AuthResponse> createShop(
            @Valid @RequestBody CreateShopRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        AuthResponse response = shopService.createShop(request, userDetails.getUsername());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/current")
    public ResponseEntity<ShopDto> getCurrentShop(@AuthenticationPrincipal UserDetails userDetails) {
        ShopDto shop = shopService.getCurrentShop(userDetails.getUsername());
        return ResponseEntity.ok(shop);
    }

    @PutMapping("/current")
    public ResponseEntity<AuthResponse> updateShop(
            @Valid @RequestBody CreateShopRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        AuthResponse response = shopService.updateShop(request, userDetails.getUsername());
        return ResponseEntity.ok(response);
    }
}
