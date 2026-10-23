package com.noteworkshop.config;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.noteworkshop.user.User;
import com.noteworkshop.user.UserMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements ApplicationRunner {

    private final UserMapper userMapper;

    @Override
    public void run(ApplicationArguments args) {
        Long adminCount = userMapper.selectCount(Wrappers.<User>lambdaQuery().eq(User::getRole, "ADMIN"));
        if (adminCount != null && adminCount > 0) {
            return;
        }
        User admin = new User();
        admin.setUsername("admin");
        admin.setPassword(new BCryptPasswordEncoder().encode("admin123"));
        admin.setNickname("平台管理员");
        admin.setRole("ADMIN");
        admin.setStatus(1);
        userMapper.insert(admin);
        log.info("已初始化默认管理员账号：admin / admin123（请及时修改密码）");
    }
}
