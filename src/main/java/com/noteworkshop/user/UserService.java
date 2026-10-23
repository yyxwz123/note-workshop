package com.noteworkshop.user;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.noteworkshop.common.BizException;
import com.noteworkshop.security.JwtUtil;
import com.noteworkshop.user.dto.AuthResponse;
import com.noteworkshop.user.dto.LoginRequest;
import com.noteworkshop.user.dto.ProfileRequest;
import com.noteworkshop.user.dto.RegisterRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserMapper userMapper;
    private final JwtUtil jwtUtil;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @Transactional
    public User register(RegisterRequest request) {
        Long count = userMapper.selectCount(
                Wrappers.<User>lambdaQuery().eq(User::getUsername, request.username()));
        if (count != null && count > 0) {
            throw new BizException("用户名已存在");
        }
        User user = new User();
        user.setUsername(request.username());
        user.setPassword(passwordEncoder.encode(request.password()));
        user.setNickname(StringUtils.hasText(request.nickname()) ? request.nickname() : request.username());
        user.setRole("USER");
        user.setStatus(1);
        userMapper.insert(user);
        user.setPassword(null);
        log.info("用户注册成功 username={} id={}", user.getUsername(), user.getId());
        return user;
    }

    public AuthResponse login(LoginRequest request) {
        User user = userMapper.selectOne(
                Wrappers.<User>lambdaQuery().eq(User::getUsername, request.username()));
        if (user == null || !passwordEncoder.matches(request.password(), user.getPassword())) {
            throw new BizException(401, "用户名或密码错误");
        }
        if (user.getStatus() != null && user.getStatus() == 0) {
            throw new BizException(403, "账号已被禁用");
        }
        String token = jwtUtil.issue(user.getId(), user.getUsername());
        user.setPassword(null);
        log.info("用户登录成功 username={} id={}", user.getUsername(), user.getId());
        return new AuthResponse(token, user);
    }

    public User me(Long userId) {
        User user = userMapper.selectById(userId);
        if (user == null) {
            throw new BizException(404, "用户不存在");
        }
        user.setPassword(null);
        return user;
    }

    @Transactional
    public User updateProfile(Long userId, ProfileRequest request) {
        User user = me(userId);
        if (StringUtils.hasText(request.nickname())) {
            user.setNickname(request.nickname());
        }
        if (request.bio() != null) {
            user.setBio(request.bio());
        }
        if (StringUtils.hasText(request.avatar())) {
            user.setAvatar(request.avatar());
        }
        user.setPassword(null);
        userMapper.updateById(user);
        return user;
    }
}
