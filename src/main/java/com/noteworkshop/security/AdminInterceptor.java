package com.noteworkshop.security;

import com.noteworkshop.common.BizException;
import com.noteworkshop.user.User;
import com.noteworkshop.user.UserMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
@RequiredArgsConstructor
public class AdminInterceptor implements HandlerInterceptor {

    private final UserMapper userMapper;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }
        Long userId = UserContext.require();
        User user = userMapper.selectById(userId);
        if (user == null || !"ADMIN".equals(user.getRole())) {
            throw new BizException(403, "需要管理员权限");
        }
        return true;
    }
}
