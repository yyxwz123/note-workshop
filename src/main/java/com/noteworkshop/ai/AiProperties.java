package com.noteworkshop.ai;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "app.ai")
public class AiProperties {

    /** 是否启用 AI 功能（没有可用 Key 时可置为 false） */
    private boolean enabled = true;

    /** 客服 system prompt */
    private String systemPrompt = "你是笔记工坊平台的 AI 助手，只回答与平台和读书笔记相关的问题。";

    /** 客服上下文窗口（消息条数，10 轮 ≈ 20 条） */
    private int windowSize = 20;
}
