package com.noteworkshop.follow.dto;

public record AuthorVO(
        Long id,
        String nickname,
        String avatar,
        String bio,
        long fansCount,
        long noteCount,
        boolean followed
) {
}
