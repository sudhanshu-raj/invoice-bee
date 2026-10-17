package com.app.invoice_bee.services;

import com.app.invoice_bee.dtos.AuthResponse;
import com.app.invoice_bee.dtos.SigninRequest;
import com.app.invoice_bee.dtos.SignupRequest;
import com.app.invoice_bee.dtos.UserDto;
import com.app.invoice_bee.entities.User;
import com.app.invoice_bee.entities.UserRole;
import com.app.invoice_bee.repositories.UserRepository;
import com.app.invoice_bee.security.JwtUtil;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtUtil jwtUtil) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    @Transactional
    public AuthResponse signup(SignupRequest request) {
        String email = request.getEmail().trim().toLowerCase();
        String phone = request.getPhone().trim();

        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("An account with this email already exists");
        }

        if (userRepository.existsByPhone(phone)) {
            throw new IllegalArgumentException("An account with this phone number already exists");
        }

        User user = new User();
        user.setFullName(request.getName().trim());
        user.setPhone(phone);
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setRole(UserRole.OWNER);
        user.setActive(true);
        user.setShop(null);

        User savedUser = userRepository.save(user);
        String token = jwtUtil.generateToken(savedUser);

        return new AuthResponse(token, mapToDto(savedUser));
    }

    @Transactional(readOnly = true)
    public AuthResponse signin(SigninRequest request) {
        String identifier = request.getEmail().trim();

        User user = userRepository.findByEmail(identifier.toLowerCase())
                .or(() -> userRepository.findByPhone(identifier))
                .orElseThrow(() -> new BadCredentialsException("Invalid email/phone or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new BadCredentialsException("Invalid email/phone or password");
        }

        if (!Boolean.TRUE.equals(user.getActive())) {
            throw new DisabledException("Your account is deactivated. Please contact support.");
        }

        String token = jwtUtil.generateToken(user);
        return new AuthResponse(token, mapToDto(user));
    }

    @Transactional(readOnly = true)
    public UserDto getCurrentUser(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found with email: " + email));
        return mapToDto(user);
    }

    public UserDto mapToDto(User user) {
        return new UserDto(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getPhone(),
                user.getRole() != null ? user.getRole().name() : null,
                user.getShop() != null ? user.getShop().getId() : null
        );
    }
}
