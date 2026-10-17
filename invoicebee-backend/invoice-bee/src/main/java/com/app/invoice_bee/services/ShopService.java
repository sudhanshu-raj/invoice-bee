package com.app.invoice_bee.services;

import com.app.invoice_bee.dtos.AuthResponse;
import com.app.invoice_bee.dtos.CreateShopRequest;
import com.app.invoice_bee.dtos.ShopDto;
import com.app.invoice_bee.entities.Shop;
import com.app.invoice_bee.entities.User;
import com.app.invoice_bee.repositories.ShopRepository;
import com.app.invoice_bee.repositories.UserRepository;
import com.app.invoice_bee.security.JwtUtil;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ShopService {

    private final ShopRepository shopRepository;
    private final UserRepository userRepository;
    private final AuthService authService;
    private final JwtUtil jwtUtil;

    public ShopService(
            ShopRepository shopRepository,
            UserRepository userRepository,
            AuthService authService,
            JwtUtil jwtUtil
    ) {
        this.shopRepository = shopRepository;
        this.userRepository = userRepository;
        this.authService = authService;
        this.jwtUtil = jwtUtil;
    }

    @Transactional
    public AuthResponse createShop(CreateShopRequest request, String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new IllegalArgumentException("User not found with email: " + userEmail));

        Shop shop;
        if (user.getShop() != null) {
            shop = user.getShop();
        } else {
            shop = new Shop();
        }

        shop.setName(request.getName().trim());
        if (request.getCurrency() != null && !request.getCurrency().isBlank()) {
            shop.setCurrency(request.getCurrency().trim());
        } else if (shop.getCurrency() == null) {
            shop.setCurrency("INR");
        }

        shop.setEmail(request.getEmail() != null && !request.getEmail().isBlank() ? request.getEmail().trim() : user.getEmail());
        shop.setPhone(request.getPhone() != null && !request.getPhone().isBlank() ? request.getPhone().trim() : user.getPhone());
        shop.setGstin(request.getGstin() != null && !request.getGstin().isBlank() ? request.getGstin().trim() : null);
        shop.setAddress(request.getAddress() != null && !request.getAddress().isBlank() ? request.getAddress().trim() : null);

        Shop savedShop = shopRepository.save(shop);
        user.setShop(savedShop);
        User savedUser = userRepository.save(user);

        String token = jwtUtil.generateToken(savedUser);
        return new AuthResponse(token, authService.mapToDto(savedUser));
    }

    @Transactional
    public AuthResponse updateShop(CreateShopRequest request, String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new IllegalArgumentException("User not found with email: " + userEmail));

        Shop shop = user.getShop();
        if (shop == null) {
            shop = new Shop();
        }

        if (request.getName() != null && !request.getName().isBlank()) {
            shop.setName(request.getName().trim());
        }
        if (request.getCurrency() != null && !request.getCurrency().isBlank()) {
            shop.setCurrency(request.getCurrency().trim());
        }
        if (request.getEmail() != null) {
            shop.setEmail(request.getEmail().trim());
        }
        if (request.getPhone() != null) {
            shop.setPhone(request.getPhone().trim());
        }
        if (request.getGstin() != null) {
            shop.setGstin(request.getGstin().trim());
        }
        if (request.getAddress() != null) {
            shop.setAddress(request.getAddress().trim());
        }

        Shop savedShop = shopRepository.save(shop);
        user.setShop(savedShop);
        User savedUser = userRepository.save(user);

        String token = jwtUtil.generateToken(savedUser);
        return new AuthResponse(token, authService.mapToDto(savedUser));
    }

    @Transactional(readOnly = true)
    public ShopDto getCurrentShop(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new IllegalArgumentException("User not found with email: " + userEmail));

        Shop shop = user.getShop();
        if (shop == null) {
            throw new IllegalArgumentException("No shop registered for current user");
        }

        return mapToDto(shop);
    }

    public ShopDto mapToDto(Shop shop) {
        return new ShopDto(
                shop.getId(),
                shop.getName(),
                shop.getCurrency(),
                shop.getEmail(),
                shop.getPhone(),
                shop.getGstin(),
                shop.getAddress()
        );
    }
}
