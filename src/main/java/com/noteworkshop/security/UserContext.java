package com.noteworkshop.security;

public final class UserContext {

    private static final ThreadLocal<Long> CURRENT = new ThreadLocal<>();

    private UserContext() {
    }

    public static void set(Long userId) {
        CURRENT.set(userId);
    }

    public static Long get() {
        return CURRENT.get();
    }

    public static Long require() {
        Long id = CURRENT.get();
        if (id == null) {
            throw new com.noteworkshop.common.BizException(401, "未登录");
        }
        return id;
    }

    public static void clear() {
        CURRENT.remove();
    }
}
