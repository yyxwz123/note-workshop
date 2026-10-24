# Day 2 · 认证与审核

> 目标：讲清"一次请求怎么证明你是谁"，以及"公开笔记为什么要审核、状态怎么流转"。
> 时间：上午 2h · 下午 2h · 晚上 1h
> 配套：[五日计划](../五日答辩学习计划.md) · [代码解析](../项目代码解析.md) · [题库](../答辩题库.md)

---

## 0. 今天要解决的三个问题

1. 用户登录后，服务端**凭什么**相信下一次请求是他？
2. 密码为什么不能明文存？BCrypt 做了什么？
3. 一篇笔记从"发布"到"公开"，状态怎么变？谁能改？

---

## 1. 知识点详解

### 1.1 认证 vs 授权（先分清）

- **认证（Authentication）**：你是谁？→ 登录、验 token。失败 **401**。
- **授权（Authorization）**：你能做什么？→ 是不是作者、是不是管理员。失败 **403**。

**类比**：进小区刷门禁是认证；进了小区能不能进泳池是授权。

本项目的 403 场景：

- 改别人的笔记 / 删别人的评论；
- 普通用户访问 `/api/admin/**`；
- 访问别人的 AI 会话。

### 1.2 Session vs JWT：会员卡与身份证

| | Session | JWT |
| --- | --- | --- |
| 状态存哪 | 服务端内存/Redis | 客户端（token 自带信息） |
| 服务端是否要存 | 要 | 不要 |
| 扩展性 | 多台机器要共享 | 天然适合水平扩展 |
| 注销 | 删 session 即可 | 难，需要黑名单/短过期 |
| 适合 | 传统 Web | 前后端分离、移动端 |

**本项目选 JWT**：前后端分离、无状态、答辩演示方便；代价是注销只能前端删 token（题库 Q10 会追问）。

### 1.3 JWT 长什么样

三段，用点分隔：

```
eyJhbGciOiJIUzM4NCJ9 . eyJzdWIiOiIxIiwidXNlcm5hbWUiOiJkZW1vMDEiLCJpYXQiOjE3... . EFcCTiul...
      header                    payload                                   signature
```

- **header**：算法（本项目实际是 **HS384**，由密钥长度决定）；
- **payload**：`sub`（用户 id）、`username`、`iat`（签发时间）、`exp`（过期时间）——**可被 Base64 解码，不能放密码**；
- **signature**：用服务端密钥对前两段签名，防篡改。

**验证过程**：服务端用同一密钥重算签名，不一致或过期就拒绝。

### 1.4 BCrypt：为什么同一密码每次哈希都不同

**通俗解释**：普通哈希像"把纸撕碎"，撕法固定；BCrypt 是"每张纸配一把不同的盐再撕"，还故意撕得慢。

- 自带随机盐，防彩虹表；
- cost=10，计算慢，暴力破解成本高；
- 校验用 `matches(明文, 哈希)`，不需要解密（也解不了）。

代码：`UserService.register` 里 `passwordEncoder.encode(...)`；`login` 里 `matches(...)`。

### 1.5 拦截器 vs 过滤器 vs AOP

| 机制 | 位置 | 能拿到什么 | 本项目用途 |
| --- | --- | --- | --- |
| Filter | Servlet 最外层 | request/response | 未使用（CORS 由 Spring 处理） |
| Interceptor | DispatcherServlet 之后、Controller 之前 | handler、request | 登录校验、管理员校验 |
| AOP | 方法调用 | 方法参数 | 未使用（可做操作日志） |

**为什么用拦截器**：能拿到 Spring MVC 的 handler、能直接抛业务异常交给全局处理器，代码直观。

### 1.6 ThreadLocal：每个请求一个"小抽屉"

**通俗解释**：餐厅只有一个服务员（线程池里的线程会复用），但每桌的点菜单不能混。ThreadLocal 就是"每个线程一个抽屉"，请求进来放 userId，请求结束必须清空。

- `UserContext.set(id)` 在拦截器里；
- `UserContext.require()` 在 Service/Controller 里取；
- `afterCompletion` 里 `clear()`——**不清会串号**，下一个请求可能拿到上一个用户。

这是面试高频点：线程池复用导致 ThreadLocal 泄漏。

### 1.7 CORS 预检：为什么 OPTIONS 要放行

浏览器跨域发 `POST + Authorization` 前，会先发一个 `OPTIONS` 预检问"允不允许"。

- 预检请求不带 token；
- 如果拦截器直接拦，会返回 500/401，浏览器就不会发真实请求；
- 所以 `AuthInterceptor` 第一行判断 `OPTIONS` 直接放行，再由 Spring 的 CORS 配置返回允许头。

**实测**：预检返回 200 + `Access-Control-Allow-Origin`。

### 1.8 审核状态机（今天最重要）

| 状态 | 含义 | 谁能看到 |
| --- | --- | --- |
| 1 | 已发布 | 所有人（公开时） |
| 2 | 待审核 | 仅作者与管理员 |
| 3 | 已驳回 | 仅作者与管理员 |
| 0 | 已下架 | 仅作者与管理员 |

**流转**：

```
创建/修改公开笔记 → 2 待审核
管理员通过        → 1 已发布（写 reviewed_at）
管理员驳回        → 3 已驳回（写 reject_reason）
管理员下架        → 0 已下架
用户改为私有      → 1（私有也需要 status=1 才能被自己看到）
```

**关键规则**：`status` 永远由服务端决定，客户端传什么都不算。

### 1.9 越权：水平和垂直

- **水平越权**：同角色之间，A 改 B 的笔记 → 靠 `requireOwned` 校验 `note.userId == 当前用户`；
- **垂直越权**：普通用户干管理员的事 → 靠 `AdminInterceptor` 校验 `role=ADMIN`。

**防御原则**：每个涉及资源的接口都要校验归属，不能只靠"前端不显示按钮"。

### 1.10 文件上传的安全点

1. 非空校验；
2. 后缀白名单（jpg/jpeg/png/gif/webp），防止传 `.jsp/.exe`；
3. 单文件 10MB、请求 50MB 限制；
4. **UUID 重命名**，防止覆盖与路径穿越（`../../`）；
5. 只存相对 URL，数据库不存绝对路径；
6. 生产还应校验文件头、压缩图片、放 OSS + CDN。

---

## 2. 代码逐行读

### 2.1 JWT 签发与校验

文件：`src/main/java/com/noteworkshop/security/JwtUtil.java:20-46`

```java
public JwtUtil(JwtProperties properties) {
    this.key = Keys.hmacShaKeyFor(properties.getSecret().getBytes(StandardCharsets.UTF_8));
    this.expireMillis = Duration.ofDays(properties.getExpireDays()).toMillis();
}

public String issue(Long userId, String username) {
    Date now = new Date();
    return Jwts.builder()
            .subject(String.valueOf(userId))          // 谁
            .claim("username", username)              // 附加信息（可解码，别放敏感数据）
            .issuedAt(now)                            // 何时签发
            .expiration(new Date(now.getTime() + expireMillis)) // 7 天后过期
            .signWith(key)                            // 用密钥签名（HS384）
            .compact();                               // 拼成三段字符串
}

public Claims parse(String token) {
    return Jwts.parser()
            .verifyWith(key)                          // 验签：防篡改
            .build()
            .parseSignedClaims(token)                 // 同时校验过期
            .getPayload();
}
```

**要点**：

- `hmacShaKeyFor` 要求密钥 ≥ 32 字节，长度决定算法（51 字节 → HS384）；
- `parse` 抛异常 = 签名不对或已过期，调用方统一转 401；
- 不要把用户角色放进 token 后就永久信任——本项目管理员校验是**查库**的，角色变更立刻生效。

### 2.2 拦截器

文件：`src/main/java/com/noteworkshop/security/AuthInterceptor.java:17-38`

```java
public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
    if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
        return true;                                  // 1. 预检放行，否则跨域直接挂
    }
    String header = request.getHeader("Authorization");
    if (header == null || !header.startsWith("Bearer ")) {
        throw new BizException(401, "未登录");          // 2. 没带 token
    }
    try {
        UserContext.set(jwtUtil.userId(header.substring(7).trim())); // 3. 取 userId 放进当前线程
        return true;                                  // 4. 放行
    } catch (Exception e) {
        throw new BizException(401, "登录已过期，请重新登录"); // 5. 签名错/过期
    }
}

public void afterCompletion(...) {
    UserContext.clear();                              // 6. 必须清理，防线程复用串号
}
```

**注册顺序**：`WebMvcConfig.java:30-43`

```java
registry.addInterceptor(authInterceptor)
        .addPathPatterns("/api/**")
        .excludePathPatterns("/api/auth/**", "/api/public/**", "/api/health")
        .order(1);                                    // 先认证
registry.addInterceptor(adminInterceptor)
        .addPathPatterns("/api/admin/**")
        .order(2);                                    // 再授权
```

**为什么先 Auth 后 Admin**：管理员校验要用 `UserContext` 里的 userId，顺序反了拿不到人。

---

## 3. 动手任务

### 任务 A：四组鉴权实验（40 分钟）

```bash
# 1. 登录拿 token
curl -X POST localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"demo01\",\"password\":\"123456\"}"

# 2. 带 token 访问
curl localhost:8080/api/users/me -H "Authorization: Bearer <token>"

# 3. 改坏 token 最后一个字符（模拟篡改）
curl localhost:8080/api/users/me -H "Authorization: Bearer <改坏的token>"

# 4. 普通用户访问后台
curl localhost:8080/api/admin/dashboard -H "Authorization: Bearer <普通用户token>"
```

记录：每组返回的 `code` 和 `message`。

### 任务 B：审核闭环（40 分钟）

1. demo01 发一篇公开笔记 → 查 `status` 应为 2；
2. admin 登录 → 待审核列表 → 驳回（原因"内容过于简略"）；
3. demo01 看"我的笔记" → `status=3`，能看到驳回原因；
4. demo01 修改后再提交 → `status` 回到 2；
5. admin 通过 → `status=1`，公开列表出现。

每步执行：

```sql
SELECT id,title,is_public,status,reject_reason,reviewed_at
FROM note ORDER BY id DESC LIMIT 1;
```

### 任务 C：看一次 CORS 预检（10 分钟）

浏览器 DevTools → Network → 找一条 `OPTIONS /api/notes`，看：

- 请求头有 `Access-Control-Request-Method`；
- 响应头有 `Access-Control-Allow-Origin: http://localhost:8081`。

### 任务 D：画状态机（20 分钟）

把四个状态画成图，每条箭头写清"谁、在什么条件下、触发什么动作"。

---

## 4. 常见误区

| 误区 | 纠正 |
| --- | --- |
| 把 token 当加密，往里面放密码 | payload 只是 Base64，可解码 |
| 在 token 里放 role 就永久信任 | 角色可能被改，敏感操作应查库（本项目管理员查库） |
| 拦截器里 set 了 ThreadLocal 不清理 | 线程池复用会串用户，必须 `afterCompletion` 清理 |
| 认为 401 和 403 可以混用 | 未登录用 401，无权限用 403 |
| 用前端隐藏按钮代替后端校验 | 直接调接口就绕过了，后端必须校验 |

---

## 5. 今日自测（7 题）

**Q1** JWT 三段分别是什么？哪一段不能放敏感信息？

<details><summary>参考答案</summary>

header.payload.signature；payload 只是 Base64 编码，可被解码，不能放密码。
</details>

**Q2** 本项目 token 用什么算法？为什么？

<details><summary>参考答案</summary>

HS384。`Keys.hmacShaKeyFor` 根据密钥长度选择：51 字节 → 384 位 → HS384。
</details>

**Q3** 为什么 `afterCompletion` 必须 `clear()`？

<details><summary>参考答案</summary>

Tomcat 线程池复用线程，不清理会让下一个请求读到上一个用户的 userId，造成越权。
</details>

**Q4** OPTIONS 预检如果被拦截会怎样？

<details><summary>参考答案</summary>

浏览器拿不到允许头，真实请求不会发出；且拦截器抛异常会变成 500。本项目第一行直接放行。
</details>

**Q5** 401 和 403 各举一个本项目的例子。

<details><summary>参考答案</summary>

401：没带 token 访问 `/api/users/me`；403：普通用户访问 `/api/admin/dashboard`，或改别人的笔记。
</details>

**Q6** 用户能不能伪造请求把笔记设为已发布？

<details><summary>参考答案</summary>

不能。`status` 由服务端在创建/修改时强制设为 2，公开列表只查 `is_public=1 AND status=1`。
</details>

**Q7** BCrypt 为什么每次哈希结果不同？还能校验吗？

<details><summary>参考答案</summary>

每次生成随机盐，盐存在哈希串里；校验时取出盐重新计算比对（`matches`），所以结果不同也能验证。
</details>

---

## 6. 今日复盘

```markdown
## Day 2 复盘
- 能背出的链路：JWT 签发 → 拦截 → ThreadLocal → 清理
- 状态机还有哪条边不熟：
- 明天要补的：评论树 / 点赞并发
```

**明天预告**：点赞幂等与并发、评论树构建、级联删除、关注统计、管理后台双层校验。
