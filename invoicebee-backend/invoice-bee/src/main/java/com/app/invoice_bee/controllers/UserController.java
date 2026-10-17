package com.app.invoice_bee.controllers;

import com.app.invoice_bee.dtos.CreateUserRequest;
import com.app.invoice_bee.dtos.UserDto;
import com.app.invoice_bee.services.UserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping
    public ResponseEntity<UserDto> createTeamUser(
            @Valid @RequestBody CreateUserRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        UserDto createdUser = userService.createTeamUser(request, userDetails.getUsername());
        return ResponseEntity.status(HttpStatus.CREATED).body(createdUser);
    }

    @GetMapping
    public ResponseEntity<List<UserDto>> getTeamUsers(@AuthenticationPrincipal UserDetails userDetails) {
        List<UserDto> users = userService.getTeamUsers(userDetails.getUsername());
        return ResponseEntity.ok(users);
    }
}
