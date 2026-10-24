# Day 4 · AI 与前端联调

> 目标：讲清 AI 调用的成功/失败两条路径，以及前后端怎么配合（代理、守卫、打包）。
> 时间：上午 2h · 下午 2h · 晚上 1h
> 配套：[五日计划](../五日答辩学习计划.md) · [代码解析](../项目代码解析.md) · [题库](../答辩题库.md)

---

## 0. 今天要解决的三个问题

1. 点一下"生成总结"，后端到底做了什么？失败了呢？
2. AI 客服怎么保证 A 看不到 B 的会话？
3. 前端 8081 的请求怎么打到 8080？打包后为什么刷新不 404？

---

## 1. 知识点详解

### 1.1 大模型 API 长什么样

**通俗解释**：把"系统提示 + 历史对话 + 这次的问题"打包发给模型服务，它返回一段文字。

主流接口都兼容 OpenAI 协议：`POST /v1/chat/completions`，请求体包含 `model`、`messages`、`temperature`。DeepSeek、通义、Kimi 大多兼容。

本项目通过 `AI_BASE_URL` / `AI_MODEL` / `AI_API_KEY` 配置，默认接 DeepSeek。

### 1.2 Spring AI 的 ChatClient

```java
chatClient.prompt()
    .system("你是读书笔记助手")   // 角色与边界
    .user("请总结……")           // 具体任务
    .call()                     // 同步调用
    .content();                 // 取文本
```

- `system` 设定角色和限制（本项目要求"只依据笔记内容、不编造"）；
- `user` 放具体任务与素材；
- `call()` 是同步阻塞，失败抛异常。

### 1.3 三类 Prompt 的差别

| 类型 | 目标 | 关键约束 |
| --- | --- | --- |
| SUMMARY | 总结 | ≤200 字，只依据原文 |
| AUDIENCE | 推荐人群 | 3 类，每类给理由 |
| SCORE | 打分 | 三个维度各 10 分 + 总分 + 改进建议 |

**Prompt 三要素**：角色（你是谁）、任务（做什么）、约束（长度/格式/不能做什么）。缺约束就会输出很长或跑题。

### 1.4 Token 与上下文窗口

**通俗解释**：模型一次能读的字数有限，而且按 token 收费。

- 历史越长，越贵越慢；
- 本项目只取最近 **20 条**消息（约 10 轮）；
- 更好做法：历史摘要 + 关键信息提取 + 向量检索。

### 1.5 会话隔离：A 不能看 B

每张 `ai_chat_session` 都有 `user_id`；每次操作先 `requireSession`：

```java
if (!session.getUserId().equals(userId)) throw new BizException(403, "无权访问他人的会话");
```

**原则**：资源级鉴权，不能只靠"前端只显示自己的会话"。

### 1.6 失败降级：AI 挂了，主流程不能挂

本项目策略：

1. 捕获异常 → 写 `ai_call_log`（scene、success=0、latency、error）；
2. 抛 503 + 简要原因；
3. 前端提示"AI 未配置/暂不可用"；
4. 其他功能（笔记、评论、点赞）完全不受影响。

**为什么要记录**：后台能统计成功率、定位是 Key 错还是网络问题。

### 1.7 为什么 AI 结果要人工确认

产品原则：**AI 辅助、不代写**。

- 生成接口只返回内容，不写库；
- 用户点"保存"才写 `note_ai`；
- `note_id` 唯一索引保证一篇笔记只留一条；
- 笔记详情返回 `aiType/aiContent`，前端单独展示。

这是"技术为人服务"的体现，答辩时是加分点。

### 1.8 Vue 3 组合式 API（够用版）

```vue
<script setup>
import { ref, onMounted } from 'vue'
const notes = ref([])
const loading = ref(false)
async function load() {
  loading.value = true
  try { notes.value = await api.get('/api/public/notes') } finally { loading.value = false }
}
onMounted(load)
</script>
```

- `ref` 包基本类型/数组，模板自动解包；
- `reactive` 包对象；
- `onMounted` 等生命周期；
- 逻辑按功能聚在 `setup` 里，比 Options API 更好复用。

### 1.9 axios 拦截器：统一加 token、统一解包

```js
http.interceptors.request.use((config) => {
  const token = localStorage.getItem('nw_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

http.interceptors.response.use((response) => {
  const body = response.data
  if (body.code === 0) return body.data      // 成功：直接给业务数据
  if (body.code === 401) redirectToLogin()   // 未登录：清 token 跳登录
  return Promise.reject(new Error(body.message))
})
```

**好处**：页面里不用每次写 token 和 `res.data.data`；**注意**：401 只跳一次，避免循环。

### 1.10 路由守卫：进页面前先查证件

```js
router.beforeEach((to) => {
  if (to.meta.guestOnly && auth.isLoggedIn()) return { name: 'home' }
  if (to.meta.requiresAuth && !auth.isLoggedIn())
    return { name: 'login', query: { redirect: to.fullPath } }
  if (to.meta.admin && !auth.isAdmin()) return { name: 'home' }
  return true
})
```

- `requiresAuth`：我的笔记、发布、AI、后台；
- `admin`：仅管理员；
- `guestOnly`：登录页，已登录就别再进。

**注意**：前端守卫只是体验，真正的权限在后端。

### 1.11 开发代理 vs 生产同源

- 开发：浏览器访问 8081，devServer 把 `/api`、`/uploads` 转发到 8080，**浏览器认为同源**，没有跨域；
- 生产：前端打包进后端 `static`，同源，也不需要 CORS。

后端仍配了 CORS（8081），是为了"前端独立部署"时也能用。

### 1.12 打包后刷新为什么 404

`/notes/1` 是前端路由，服务器上没有这个文件。刷新时请求打到后端，找不到就 404。

解决：`SpaForwardController` 把前端路由 forward 到 `index.html`，由 Vue Router 接管。

### 1.13 测试金字塔与本项目

| 层 | 本项目 | 说明 |
| --- | --- | --- |
| 单元测试 | 无 | 应补 Service 层（JUnit + Mockito） |
| 接口测试 | `scripts/api-test.mjs` 56 例 | 真实 HTTP，覆盖权限/状态/级联 |
| UI 测试 | `ui-check.mjs` 10 页 + `ui-flow.mjs` 流程 | 真浏览器，查控制台错误 |

**答辩诚实说法**：集成测试覆盖较全，单元测试是下一步。

---

## 2. 代码逐行读

### 2.1 AI 客服主流程

文件：`src/main/java/com/noteworkshop/ai/AiService.java:115-165`

```java
public Map<String, Object> chat(Long userId, ChatRequest request) {
    ensureEnabled();                                   // 1. 开关：false 直接 503

    AiChatSession session;
    if (request.sessionId() == null) {                 // 2. 新会话：建一条，标题取首句
        session = new AiChatSession();
        session.setUserId(userId);
        session.setTitle(shortTitle(request.message()));
        sessionMapper.insert(session);
    } else {
        session = requireSession(userId, request.sessionId()); // 3. 老会话：校验归属
    }

    List<AiChatMessage> history = messageMapper.selectList(...  // 4. 最近 20 条
            .orderByDesc(AiChatMessage::getId)
            .last("limit " + aiProperties.getWindowSize()));
    Collections.reverse(history);                      // 5. 反转成时间正序

    AiChatMessage userMessage = new AiChatMessage();   // 6. 先落用户消息
    userMessage.setSessionId(session.getId());
    userMessage.setRole("user");
    userMessage.setContent(request.message());
    messageMapper.insert(userMessage);

    String prompt = buildChatPrompt(history, request.message()); // 7. 拼历史 + 本次问题
    try {
        String reply = callAi(aiProperties.getSystemPrompt(), prompt); // 8. 调模型
        logCall(userId, "CHAT", true, null, 耗时);      // 9. 成功日志
    } catch (Exception e) {
        logCall(userId, "CHAT", false, e.getMessage(), 耗时); // 10. 失败也要记
        throw new BizException(503, "AI 服务暂不可用：" + brief(e.getMessage()));
    }

    // 11. 落助手消息、更新会话时间、返回 reply
}
```

**关键设计**：

- 方法**故意不加 `@Transactional`**：AI 失败时，用户消息和失败日志要保留，否则统计不到；
- 第 4 步限制 20 条：控制 token 成本；
- 第 10 步：先记日志再抛异常，保证可观测。

### 2.2 前端守卫与拦截器

文件：`frontend/src/router/index.js:89-106`、`frontend/src/api/index.js:23-62`

逐行要点已在 1.9、1.10 说明，建议对照源码读一遍，重点看：

- 401 时 `redirectingToLogin` 标志位，防止多个请求同时触发跳转；
- `redirect` 参数保留原地址，登录后能跳回去。

---

## 3. 动手任务

### 任务 A：无 Key 调 AI（30 分钟）

```bash
# 用 demo01 的 token 调生成
curl -X POST localhost:8080/api/ai/notes/1/generate \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"SUMMARY\"}"
```

预期：`code=503`，message 提示 AI 不可用；服务端日志有 WARN；然后查：

```sql
SELECT scene,success,latency_ms,LEFT(error_msg,80) FROM ai_call_log ORDER BY id DESC LIMIT 3;
```

再去后台"AI 统计"看失败次数有没有 +1。

### 任务 B：会话隔离（20 分钟）

1. demo01 建一个会话，记下 sessionId；
2. 注册一个新用户，用他的 token 调 `GET /api/ai/sessions/{id}/messages`；
3. 预期 403。

### 任务 C：前端联调（40 分钟）

1. 改 `HomeView.vue` 里一句文案 → 保存 → 浏览器自动刷新（热更新）；
2. 停掉后端 → 点登录 → 看错误提示是否友好；
3. 未登录访问 `/me` → 应跳登录并带 `redirect`；
4. 登录后回到原页面。

### 任务 D：跑测试（30 分钟）

```powershell
node scripts/api-test.mjs     # 56 个用例
node scripts/ui-check.mjs     # 10 个页面
node scripts/ui-flow.mjs      # 登录 + 发布流程
```

读 `docs/api-test-report.md`，找出 3 个"如果失败会暴露什么 bug"。

---

## 4. 常见误区

| 误区 | 纠正 |
| --- | --- |
| 把 AI 调用放进事务 | 远程调用耗时长，会占用数据库连接 |
| 失败只返回 500 不记录 | 无法统计与排障，必须写日志 |
| 只靠前端隐藏按钮做权限 | 直接调接口就绕过 |
| 认为前端守卫是安全边界 | 只是体验，安全在后端 |
| 打包后刷新 404 以为是 bug | history 路由需要服务端回退 |
| 用 localStorage 存密码 | 只存 token，且注意 XSS |

---

## 5. 今日自测（7 题）

**Q1** 一次 AI 总结请求，后端做了哪几步？

<details><summary>参考答案</summary>

校验笔记归属 → 拼 prompt（角色/任务/约束）→ 调 ChatClient → 成功/失败写 ai_call_log → 返回内容（不落库）。
</details>

**Q2** 没有 API Key 会怎样？主流程受影响吗？

<details><summary>参考答案</summary>

调用失败 → 写失败日志 → 返回 503 → 前端提示；笔记、评论、点赞等主流程不受影响。
</details>

**Q3** 为什么 AI 结果不直接写笔记？

<details><summary>参考答案</summary>

产品原则"辅助不代写"；用户确认后 save 才写 note_ai，且唯一索引保证一篇一条。
</details>

**Q4** 会话隔离怎么做？越权返回什么？

<details><summary>参考答案</summary>

每次操作 requireSession 校验 session.userId == 当前用户；不一致返回 403。
</details>

**Q5** axios 拦截器做了哪两件事？

<details><summary>参考答案</summary>

请求统一加 Bearer token；响应统一解包 data，code=401 清 token 跳登录。
</details>

**Q6** 开发时为什么没有跨域问题？

<details><summary>参考答案</summary>

devServer 把 /api、/uploads 代理到 8080，浏览器视为同源；生产打包进后端也是同源。
</details>

**Q7** 打包后刷新 /notes/1 为什么 404？怎么解决？

<details><summary>参考答案</summary>

history 路由在服务器上没有对应文件；SpaForwardController 把前端路由 forward 到 index.html。
</details>

---

## 6. 今日复盘

```markdown
## Day 4 复盘
- 能画出的 AI 双路径：
- 前端链路还有哪不懂：
- 明天要练的：demo 顺序
```

**明天预告**：Demo 排练、题库自测、模拟答辩与应急处理。
