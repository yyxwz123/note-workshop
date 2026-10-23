package com.noteworkshop.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    private static final String SCHEME_NAME = "bearerAuth";

    @Bean
    public OpenAPI noteWorkshopOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("笔记工坊 Note-Workshop API")
                        .version("1.0.0")
                        .description("""
                                面向在校学生的读书笔记社区后端接口。

                                - 统一响应：`{ code, message, data }`，`code=0` 表示成功
                                - 鉴权：除 `/api/auth/**`、`/api/public/**` 外均需请求头 `Authorization: Bearer <token>`
                                - 管理员接口 `/api/admin/**` 需要 ADMIN 角色
                                """)
                        .contact(new Contact().name("Note-Workshop")))
                .addSecurityItem(new SecurityRequirement().addList(SCHEME_NAME))
                .components(new Components().addSecuritySchemes(SCHEME_NAME,
                        new SecurityScheme()
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")));
    }
}
