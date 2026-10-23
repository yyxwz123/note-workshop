package com.noteworkshop.comment.dto;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public record CommentVO(
        Long id,
        Long noteId,
        Long userId,
        String nickname,
        String avatar,
        Long parentId,
        String content,
        LocalDateTime createdAt,
        List<CommentVO> children
) {
    public static CommentVO of(Long id, Long noteId, Long userId, String nickname, String avatar,
                               Long parentId, String content, LocalDateTime createdAt) {
        return new CommentVO(id, noteId, userId, nickname, avatar, parentId, content, createdAt, new ArrayList<>());
    }
}
