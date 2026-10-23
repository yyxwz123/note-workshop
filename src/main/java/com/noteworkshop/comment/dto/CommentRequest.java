package com.noteworkshop.comment.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CommentRequest(
        @NotBlank(message = "评论内容不能为空")
        @Size(max = 500, message = "评论最长 500 字")
        String content,

        Long parentId
) {
}
