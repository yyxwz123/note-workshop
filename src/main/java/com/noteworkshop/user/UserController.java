package com.noteworkshop.user;

import com.noteworkshop.common.Result;
import com.noteworkshop.security.UserContext;
import com.noteworkshop.user.dto.AuthResponse;
import com.noteworkshop.user.dto.LoginRequest;
import com.noteworkshop.user.dto.ProfileRequest;
import com.noteworkshop.user.dto.RegisterRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api")
public class UserController {

    private final UserService userService;

    @PostMapping("/auth/register")
    public Result<User> register(@Valid @RequestBody RegisterRequest request) {
        return Result.ok(userService.register(request));
    }

    @PostMapping("/auth/login")
    public Result<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return Result.ok(userService.login(request));
    }

    @GetMapping("/users/me")
    public Result<User> me() {
        return Result.ok(userService.me(UserContext.require()));
    }

    @PutMapping("/users/me")
    public Result<User> updateProfile(@Valid @RequestBody ProfileRequest request) {
        return Result.ok(userService.updateProfile(UserContext.require(), request));
    }
}
