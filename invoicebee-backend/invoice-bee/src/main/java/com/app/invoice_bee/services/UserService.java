package com.app.invoice_bee.services;

import com.app.invoice_bee.dtos.CreateUserRequest;
import com.app.invoice_bee.dtos.UserDto;
import com.app.invoice_bee.entities.User;
import com.app.invoice_bee.repositories.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthService authService;

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder, AuthService authService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.authService = authService;
    }

    @Transactional
    public UserDto createTeamUser(CreateUserRequest request, String callerEmail) {
        User caller = userRepository.findByEmail(callerEmail)
                .orElseThrow(() -> new IllegalArgumentException("User not found with email: " + callerEmail));

        if (caller.getShop() == null) {
            throw new IllegalArgumentException("Cannot add team members before completing shop setup");
        }

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
        user.setEmail(email);
        user.setPhone(phone);
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setRole(request.getRole());
        user.setShop(caller.getShop());
        user.setActive(true);

        User savedUser = userRepository.save(user);
        return authService.mapToDto(savedUser);
    }

    @Transactional(readOnly = true)
    public List<UserDto> getTeamUsers(String callerEmail) {
        User caller = userRepository.findByEmail(callerEmail)
                .orElseThrow(() -> new IllegalArgumentException("User not found with email: " + callerEmail));

        if (caller.getShop() == null) {
            return List.of(authService.mapToDto(caller));
        }

        return userRepository.findByShopId(caller.getShop().getId())
                .stream()
                .map(authService::mapToDto)
                .collect(Collectors.toList());
    }
}
