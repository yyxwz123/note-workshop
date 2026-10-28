# 笔记工坊 Note-Workshop

> 面向在校学生的读书笔记社区：记录阅读、公开分享、点赞评论、关注作者；AI 只做辅助，思考仍由你完成。

[![Java](https://img.shields.io/badge/Java-21-orange?logo=openjdk&logoColor=white)](https://openjdk.org/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.5.16-brightgreen?logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
[![MyBatis-Plus](https://img.shields.io/badge/MyBatis--Plus-3.5.17-blue)](https://baomidou.com/)
[![MySQL](https://img.shields.io/badge/MySQL-8.4-4479A1?logo=mysql&logoColor=white)](https://www.mysql.com/)
[![Vue](https://img.shields.io/badge/Vue-3-42b883?logo=vuedotjs&logoColor=white)](https://vuejs.org/)
[![Vue CLI](https://img.shields.io/badge/Vue%20CLI-5.0-34495e?logo=vue.js&logoColor=white)](https://cli.vuejs.org/)
[![JWT](https://img.shields.io/badge/Auth-JWT%20%2B%20BCrypt-000000?logo=jsonwebtokens&logoColor=white)](https://jwt.io/)

仓库地址：<https://github.com/yyxwz123/note-workshop>

---

## 目录

- [一、项目简介](#一项目简介)
- [二、功能一览](#二功能一览)
- [三、界面预览](#三界面预览)
- [四、技术栈](#四技术栈)
- [五、系统架构](#五系统架构)
- [六、数据模型](#六数据模型)
- [七、项目结构](#七项目结构)
- [八、快速开始](#八快速开始)
- [九、配置项](#九配置项)
- [十、接口文档](#十接口文档)
- [十一、测试与质量](#十一测试与质量)
- [十二、文档索引](#十二文档索引)
- [十三、部署](#十三部署)
- [十四、设计取舍](#十四设计取舍)
- [十五、常见问题](#十五常见问题)
- [十六、Roadmap](#十六roadmap)
- [十七、致谢与许可](#十七致谢与许可)

---

## 一、项目简介

做读书笔记的人常遇到三个问题：笔记散落在备忘录里、写完没有人交流、公开分享又担心内容质量。

**笔记工坊**把这些需求收进一个 Web 应用：

| 角色 | 能做什么 |
| --- | --- |
| 读者 | 浏览公开笔记、按最热/最新排序、搜索作者、点赞、评论与回复、关注作者 |
| 作者 | 写笔记（绑定书名、多图）、选择公开/私有、查看审核状态与驳回原因、管理自己的笔记与评论 |
| 管理员 | 数据概览、用户启用/禁用、公开笔记审核与下架、删除违规评论、查看 AI 调用统计 |
| 所有人 | 使用 AI 做阅读辅助（总结/适宜人群/质量评分）与智能客服（多轮对话） |

三个设计原则：

1. **先审核后公开**：公开笔记一律进入待审核，管理员通过后才出现在社区；
2. **AI 只做辅助**：AI 结果不会自动改笔记，必须用户手动保存；
3. **失败可降级**：AI 未配置或调用失败返回 503，不影响写笔记、评论、点赞等主流程。

---

## 二、功能一览

### 用户与鉴权

- [x] 注册 / 登录，密码 BCrypt 加密存储
- [x] JWT（HS384）签发与校验，7 天有效
- [x] `AuthInterceptor` 统一拦截，未登录 401、越权 403
- [x] 个人资料：昵称、简介、头像上传
- [x] 账号禁用后无法登录（管理员操作）

### 笔记

- [x] 增删改查，必须绑定图书名称
- [x] 私有 / 公开两种可见性
- [x] 多图上传（格式白名单、大小限制、UUID 重命名）
- [x] 分页、最热 / 最新排序
- [x] 仅作者本人可编辑、删除

### 互动

- [x] 点赞 / 取消点赞，唯一索引保证幂等
- [x] 一级评论 + 二级回复，评论树展示
- [x] 删除父评论级联逻辑删除子回复
- [x] 关注 / 取关、粉丝与关注列表
- [x] 作者主页、热门作者榜（按粉丝数）

### 审核与后台

- [x] 公开笔记创建/修改后进入待审核
- [x] 管理员审核通过、驳回（带原因）、下架
- [x] 用户修改后可重新提交
- [x] 后台数据概览、用户管理、评论删除
- [x] 后台独立 `AdminInterceptor` 校验 ADMIN 角色

### AI（加分项）

- [x] 阅读辅助：内容总结、适宜人群、质量评分
- [x] 结果需人工确认后保存，一篇笔记仅保留一条
- [x] 智能客服：多轮对话、会话隔离、最近 20 条上下文
- [x] 所有调用写入 `ai_call_log`，后台可看成功率与耗时
- [x] 未配置 Key 时返回 503 并给出提示

### 工程化

- [x] 统一响应 `{code, message, data}` 与全局异常处理
- [x] 参数校验（Jakarta Validation）
- [x] Swagger / OpenAPI 3.0 文档
- [x] 56 个接口自动化用例、10 个页面浏览器检查
- [x] 前端打包产物由后端统一托管，`java -jar` 即可访问

---

## 三、界面预览

| 首页（公开笔记流） | 笔记详情（点赞 / 评论 / AI） |
| --- | --- |
| ![首页](docs/screenshots/home.png) | ![笔记详情](docs/screenshots/note-detail.png) |

| AI 助手（阅读辅助 / 客服） | 管理后台 |
| --- | --- |
| ![AI 助手](docs/screenshots/ai.png) | ![管理后台](docs/screenshots/admin.png) |

> 更多界面与代码地图见 [docs/screenshots](docs/screenshots)。

---

## 四、技术栈

| 层次 | 选型 |
| --- | --- |
| 语言 / 运行时 | Java 21（JDK 25 亦可运行） |
| 后端框架 | Spring Boot 3.5.16 |
| 持久层 | MyBatis-Plus 3.5.17 + MySQL 8.4 |
| 数据库连接池 | HikariCP |
| 鉴权 | jjwt 0.12.6（HS384）+ HandlerInterceptor + BCrypt |
| AI | Spring AI 1.1.8（OpenAI 兼容协议，默认 DeepSeek） |
| 接口文档 | springdoc-openapi 2.8.9（OpenAPI 3.0.1） |
| 前端 | Vue 3 + vue-router 4 + axios，Vue CLI 5 |
| 构建 | Maven 3.9 / npm |
| 日志 | SLF4J + Logback |

---

## 五、系统架构

```
┌─────────────────────────────────────────────┐
│  Vue 3 SPA（8081 开发 / 8080 打包托管）        │
│  axios 拦截器：加 token、解包、401 跳转        │
└──────────────────┬──────────────────────────┘
                   │ HTTP /api
┌──────────────────▼──────────────────────────┐
│  Interceptor                                 │
│  AuthInterceptor（JWT）→ AdminInterceptor    │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  Controller  参数校验、统一 Result            │
├─────────────────────────────────────────────┤
│  Service     业务规则、事务、权限、AI 调用      │
├─────────────────────────────────────────────┤
│  Mapper      MyBatis-Plus CRUD / 分页         │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  MySQL 8.4（10 张表）                         │
└─────────────────────────────────────────────┘
```

**一次请求的链路（以发表评论为例）**

```
api/index.js 加 token
  → vue.config.js 代理到 8080
  → WebMvcConfig:30 注册拦截器
  → AuthInterceptor:17 验签、写 UserContext
  → CommentController:33 接参、@Valid
  → CommentService:76 业务校验、插入、计数
  → CommentMapper 执行 SQL
  → Result 包装 → GlobalExceptionHandler 兜底
```

**统一响应约定**

```json
{ "code": 0, "message": "ok", "data": { } }
```

- `code = 0` 成功；非 0 为业务错误（400 参数、401 未登录、403 无权限、404 不存在、503 服务不可用）；
- HTTP 状态通常为 200，业务结果看 `code`，便于前端统一处理。

---

## 六、数据模型

共 **10 张表**，分为社区主业务 6 张与 AI 能力 4 张。

| # | 表 | 作用 | 关键约束 |
| --- | --- | --- | --- |
| 1 | `user` | 账号与身份 | `uk_user_username` 唯一 |
| 2 | `note` | 笔记主体、审核状态、计数 | `idx_note_public(is_public,status,like_count)` |
| 3 | `note_image` | 笔记配图 | `idx_img_note(note_id)` |
| 4 | `note_like` | 点赞关系 | `uk_like_user_note(user_id,note_id)` |
| 5 | `comment` | 评论与二级回复 | `idx_comment_note(note_id,deleted)` |
| 6 | `follow` | 关注关系 | `uk_follow(follower_id,followee_id)` |
| 7 | `note_ai` | 笔记 AI 结果（每篇一条） | `uk_ai_note(note_id)` |
| 8 | `ai_call_log` | AI 调用审计 | `idx_ai_log_time`、`idx_ai_log_scene` |
| 9 | `ai_chat_session` | AI 客服会话 | `idx_chat_session_user` |
| 10 | `ai_chat_message` | 会话消息 | `idx_chat_msg_session(session_id,id)` |

```
user ──1:N──> note ──1:N──> note_image
  │             ├──1:N──> note_like <──N:1── user
  │             ├──1:N──> comment   <──N:1── user
  │             └──1:1──> note_ai
  ├──N:M──> user            （通过 follow）
  ├──1:N──> ai_call_log
  └──1:N──> ai_chat_session ──1:N──> ai_chat_message
```

**审核状态机**：`1 已发布 / 2 待审核 / 3 已驳回 / 0 已下架`；公开笔记创建或修改后一律回到 `2`。

详见 [数据库表结构（HTML）](docs/数据库表结构.html)、[建表脚本](sql/schema.sql)。

---

## 七、项目结构

```
note-workshop
├─ pom.xml
├─ sql/
│  ├─ schema.sql                全量建表（10 张表）
│  └─ upgrade_v2.sql            V1 → V2 升级
├─ docs/                        文档与截图（见「文档索引」）
├─ scripts/
│  ├─ api-test.mjs              56 个接口用例
│  ├─ ui-check.mjs              10 个页面浏览器检查
│  ├─ ui-flow.mjs               登录 → 发布 → 待审核联调
│  ├─ gen-openapi.mjs           生成 OpenAPI
│  ├─ list-inventory.mjs        生成项目清单
│  ├─ collect-source.mjs        生成源码汇编
│  ├─ export-db-html.mjs        生成表结构 HTML
│  ├─ export-db-data-html.mjs   生成数据预览 HTML
│  └─ export-code-map-html.mjs  生成可点击代码地图
├─ frontend/                    Vue 3（Vue CLI）
│  ├─ vue.config.js             8081 端口 + /api、/uploads 代理
│  └─ src/
│     ├─ api/index.js           axios 封装
│     ├─ store/                 登录态、全局提示
│     ├─ router/index.js        路由与守卫
│     ├─ views/                 11 个页面
│     └─ components/            通用组件 + 后台页签
└─ src/main/java/com/noteworkshop
   ├─ common/                   响应、分页、异常
   ├─ config/                   拦截器、CORS、分页、OpenAPI、初始化、SPA 回退
   ├─ security/                 JWT、登录拦截、管理员拦截、UserContext
   ├─ user/ note/ comment/ follow/ admin/ ai/ file/
   └─ resources/
      ├─ application.yml
      └─ static/                前端打包产物（后端托管）
```

---

## 八、快速开始

### 环境要求

| 依赖 | 版本 |
| --- | --- |
| JDK | 21+ |
| Maven | 3.6+ |
| MySQL | 8.x |
| Node.js | 18+（仅前端开发需要） |

### 1. 克隆项目

```bash
git clone git@github.com:yyxwz123/note-workshop.git
cd note-workshop
```

### 2. 初始化数据库

```bash
mysql -u root -p < sql/schema.sql
```

默认库名 `note_workshop`，字符集 `utf8mb4`。已存在旧库时执行 `sql/upgrade_v2.sql` 升级。

### 3. 启动后端

```bash
# 方式一：直接运行
mvn spring-boot:run

# 方式二：打包运行
mvn clean package -DskipTests
java -jar target/note-workshop-1.0.0.jar
```

启动后：

- 应用：<http://localhost:8080>
- 健康检查：<http://localhost:8080/api/public/health>
- Swagger UI：<http://localhost:8080/swagger-ui/index.html>

### 4. 启动前端（开发模式）

```bash
cd frontend
npm install
npm run serve      # http://localhost:8081，已代理 /api 与 /uploads 到 8080
```

### 5. 一体化打包（推荐演示用）

```bash
cd frontend && npm run build
# 将 frontend/dist/* 覆盖到 src/main/resources/static/
cd .. && mvn clean package -DskipTests
java -jar target/note-workshop-1.0.0.jar
```

之后只需访问 <http://localhost:8080>，前后端同一个端口，方便演示与部署。

### 默认账号

| 角色 | 账号 | 密码 | 说明 |
| --- | --- | --- | --- |
| 管理员 | `admin` | `admin123` | 首次启动自动创建 |
| 普通用户 | `demo01` | `123456` | 演示数据 |
| 普通用户 | `reader01` | `123456` | 演示数据 |

> 生产环境请立即修改管理员密码并替换 `JWT_SECRET`。

---

## 九、配置项

全部支持环境变量覆盖，**不要把密钥写进配置文件提交**。

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `DB_USERNAME` / `DB_PASSWORD` | `root` / `123456` | 数据库账号 |
| `JWT_SECRET` | 内置开发密钥 | 生产必须替换，建议 ≥ 48 字节 |
| `AI_ENABLED` | `true` | 关闭后 AI 接口返回 503 |
| `AI_API_KEY` | 空（占位符） | 大模型 Key，必填才能真实调用 |
| `AI_BASE_URL` | `https://api.deepseek.com` | OpenAI 兼容地址 |
| `AI_MODEL` | `deepseek-chat` | 模型名 |
| `UPLOAD_DIR` | `uploads` | 上传文件目录 |
| `SERVER_PORT` | `8080` | 后端端口 |

示例（PowerShell）：

```powershell
$env:AI_API_KEY="sk-xxxx"
$env:AI_MODEL="deepseek-chat"
java -jar target/note-workshop-1.0.0.jar
```

---

## 十、接口文档

| 方式 | 地址 |
| --- | --- |
| Swagger UI | <http://localhost:8080/swagger-ui/index.html> |
| OpenAPI JSON | <http://localhost:8080/v3/api-docs> |
| 离线文件 | [docs/openapi.yaml](docs/openapi.yaml)（OpenAPI 3.0.1，38 个路径 / 42 个操作） |
| Apifox 导入 | 导入数据 → OpenAPI/Swagger → 选择 `docs/openapi.yaml` |

**接口分组**

| 分组 | 代表接口 |
| --- | --- |
| 认证与用户 | `POST /api/auth/login`、`POST /api/auth/register`、`GET/PUT /api/users/me` |
| 笔记 | `POST /api/notes`、`GET /api/notes/mine`、`POST /api/notes/{id}/like` |
| 公开接口 | `GET /api/public/notes`、`GET /api/public/notes/{id}`、`GET /api/public/authors/hot` |
| 评论 | `GET /api/public/notes/{noteId}/comments`、`POST /api/notes/{noteId}/comments` |
| 关注 | `POST/DELETE /api/users/{id}/follow`、`GET /api/users/{id}/followers` |
| 管理后台 | `GET /api/admin/dashboard`、`POST /api/admin/notes/{id}/review` |
| AI | `POST /api/ai/notes/{noteId}/generate`、`POST /api/ai/chat` |
| 文件 | `POST /api/files/upload` |

> 鉴权：除 `/api/auth/**`、`/api/public/**` 外均需 `Authorization: Bearer <token>`；`/api/admin/**` 还需 ADMIN 角色。

完整清单见 [项目清单](docs/项目清单.md)。

---

## 十一、测试与质量

```bash
# 1) 接口全量测试（需后端已启动，56 个用例）
node scripts/api-test.mjs

# 2) 页面渲染检查（需前端已启动，10 个页面）
node scripts/ui-check.mjs

# 3) 真实用户流程（表单登录 → 发布公开笔记 → 校验待审核）
node scripts/ui-flow.mjs
```

当前结果：

| 项 | 结果 |
| --- | --- |
| 接口用例 | **56 / 56 通过** |
| 页面检查 | **10 / 10 通过，0 条控制台错误** |
| 构建 | `mvn package` 成功；前端 `npm run build` 成功 |
| 日志 | 无 ERROR（AI 未配置时仅 401 WARN，属预期降级） |

测试报告：[docs/api-test-report.md](docs/api-test-report.md)

测试覆盖：注册登录、参数校验、鉴权与越权、上传、笔记 CRUD、审核全流程、点赞幂等、评论级联、关注、后台管理、AI 降级、404。

---

## 十二、文档索引

| 文档 | 内容 |
| --- | --- |
| [项目代码解析](docs/项目代码解析.md) | 模块地图、10 张表、8 个核心机制、设计取舍 |
| [代码地图（HTML）](docs/代码地图.html) | **可点击跳转**，模块/方法直达行号，支持搜索与 VS Code 打开 |
| [功能源代码位置](docs/功能源代码位置.md) | 按功能块列出前端、后端、数据与用例位置 |
| [项目清单](docs/项目清单.md) | 56 个用例、10 张表、42 个接口一览 |
| [数据库表结构（HTML）](docs/数据库表结构.html) | 字段、类型、索引、行数，浏览器直接打开 |
| [数据库数据预览（HTML）](docs/数据库数据预览.html) | 10 张表各前 20 行真实数据 |
| [源码汇编](docs/源码汇编/00-总览.md) | 109 个源码文件按模块汇编，可通读/打印 |
| [五日答辩学习计划](docs/五日答辩学习计划.md) | 每日目标、阅读顺序、动手任务、验收标准 |
| [五日详细讲义](docs/五日学习/README.md) | 每天一份，通俗讲解 + 代码逐行 + 自测题 |
| [答辩题库（50 问速记）](docs/答辩题库.md) | 分类整理，每题 3–5 条答题要点 |
| [答辩题库详解](docs/答辩题库详解.md) | 50 题逐题详解，含原理、项目落点与追问 |
| [接口测试报告](docs/api-test-report.md) | 56 个用例的执行结果 |

---

## 十三、部署

### 单机 jar（最简单）

```bash
mvn clean package -DskipTests
java -jar target/note-workshop-1.0.0.jar
```

前端已打进 jar，8080 同时提供页面与接口。

### 后台常驻

```bash
nohup java -jar note-workshop-1.0.0.jar > app.log 2>&1 &
```

Windows 可用 `start /b java -jar ...` 或注册为服务（如 WinSW、NSSM）。

### Nginx 反向代理（可选）

```nginx
server {
    listen 80;
    server_name example.com;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

> 项目已配置 `server.forward-headers-strategy: framework`，能正确识别代理后的 https 与域名，避免 CORS 误判。

### 临时公网演示

```bash
cloudflared tunnel --url http://localhost:8080 --protocol http2
```

会得到一个临时 `https://xxx.trycloudflare.com` 地址，关闭进程即失效。

### 部署清单

- [ ] 修改 `admin` 默认密码
- [ ] 替换 `JWT_SECRET`
- [ ] 数据库使用独立账号，最小权限
- [ ] 配置 `AI_API_KEY`（不要提交到仓库）
- [ ] 限制 `uploads/` 目录权限与大小
- [ ] 配置 HTTPS 与备份策略

---

## 十四、设计取舍

| 取舍 | 原因 |
| --- | --- |
| **审核状态机**而非独立审核表 | 流程只有待审/通过/驳回/下架，单字段足够，查询简单 |
| **冗余计数** `like_count`/`comment_count` | 列表排序避免 `COUNT(*)`；用原子 SQL 保证并发一致 |
| **唯一索引**做幂等 | 点赞、关注重复请求不会产生脏数据 |
| **逻辑删除** `comment.deleted` | 保留审计痕迹，级联删除可控 |
| **邻接表** `parent_id` | 二级回复实现简单，一次查询内存建树 |
| **AI 单独 4 张表** | AI 是可选能力，失败不影响主业务，便于统计与清理 |
| **无外键约束** | 应用层保证一致性，避免高并发外键锁（演示项目取舍） |
| **前端打进 jar** | 单端口演示、部署简单，适合答辩场景 |

---

## 十五、常见问题

**Q1：启动报数据库连接失败？**  
检查 MySQL 是否启动、`application.yml` 或 `DB_USERNAME`/`DB_PASSWORD` 是否正确，库是否已执行 `schema.sql`。

**Q2：登录后接口仍返回 401？**  
前端需带 `Authorization: Bearer <token>`；token 过期（7 天）后重新登录。

**Q3：公开笔记发布后首页看不到？**  
这是审核设计：公开笔记进入待审核（`status=2`），管理员通过后才可见；作者可在「我的笔记」看到状态。

**Q4：AI 接口返回 503？**  
未配置 `AI_API_KEY` 或 Key 无效/余额不足。配置后需重启后端；查看 `ai_call_log` 的 `error_msg` 可定位原因。

**Q5：上传图片失败？**  
检查格式（jpg/png/webp/gif）与大小限制，以及 `uploads/` 目录是否可写。

**Q6：前端 8081 打开接口 404？**  
确认后端在 8080 启动，且 `vue.config.js` 的代理未被修改。

---

## 十六、Roadmap

- [ ] AI 改为 SSE 流式输出，降低首字延迟
- [ ] Refresh Token 与登出黑名单
- [ ] 图片压缩与对象存储（OSS/MinIO）
- [ ] 评论盖楼与 @ 提醒
- [ ] Docker Compose 一键启动
- [ ] 单元测试与 CI（GitHub Actions）

---

## 十七、致谢与许可

- 感谢 Spring Boot、MyBatis-Plus、Vue、Spring AI 等开源项目；
- 本项目为面试考核 / 学习作品，仅供学习交流，未声明开源许可证前请勿用于商业用途；
- 如需引用或二次开发，请保留出处并注明作者。

---

<p align="center">如果这个项目对你有帮助，欢迎点一个 ⭐ Star</p>
