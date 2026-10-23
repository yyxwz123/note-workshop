package com.noteworkshop.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "app.jwt")
public class JwtProperties {

    /** HS256 密钥，至少 32 字节；生产环境应通过环境变量注入 */
    private String secret;
    private int expireDays = 7;
}
