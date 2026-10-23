package com.noteworkshop.ai.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record AiSaveRequest(
        @NotBlank(message = "请选择 AI 功能类型")
        @Pattern(regexp = "SUMMARY|AUDIENCE|SCORE", message = "类型只能是 SUMMARY / AUDIENCE / SCORE")
        String type,

        @NotBlank(message = "AI 内容不能为空")
        String content
) {
}
