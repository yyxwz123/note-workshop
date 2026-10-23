package com.noteworkshop.user.dto;

import com.noteworkshop.user.User;

public record AuthResponse(String token, User user) {
}
