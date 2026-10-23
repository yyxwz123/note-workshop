package com.noteworkshop.user.dto;

import jakarta.validation.constraints.Size;

public record ProfileRequest(
        @Size(max = 32, message = "昵称最长 32 个字符") String nickname,
        @Size(max = 200, message = "简介最长 200 个字符") String bio,
        @Size(max = 255, message = "头像地址过长") String avatar
) {
}
