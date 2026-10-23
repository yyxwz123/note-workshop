package com.noteworkshop.ai.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ChatRequest(
        Long sessionId,
        @NotBlank(message = "消息不能为空")
        @Size(max = 2000, message = "单条消息最长 2000 字")
        String message
) {
}
