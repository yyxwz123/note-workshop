package com.noteworkshop.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank(message = "用户名不能为空")
        @Size(min = 4, max = 32, message = "用户名长度需在 4-32 位之间")
        String username,

        @NotBlank(message = "密码不能为空")
        @Size(min = 6, max = 32, message = "密码长度需在 6-32 位之间")
        String password,

        @Size(max = 32, message = "昵称最长 32 个字符")
        String nickname
) {
}
