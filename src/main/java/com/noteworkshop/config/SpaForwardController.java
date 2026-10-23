package com.noteworkshop.config;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * 单页应用（Vue Router history 模式）路由回退：
 * 前端打包产物放进 static 后，刷新 /notes/1 这类地址也能返回 index.html。
 */
@Controller
public class SpaForwardController {

    @GetMapping({
            "/", "/login", "/register", "/me", "/profile", "/ai", "/admin",
            "/notes", "/notes/**", "/users/**"
    })
    public String forward() {
        return "forward:/index.html";
    }
}
