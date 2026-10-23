package com.noteworkshop.ai;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("ai_call_log")
public class AiCallLog {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long userId;
    private String scene;
    private Integer success;
    private String errorMsg;
    private Integer latencyMs;
    private LocalDateTime createdAt;
}
