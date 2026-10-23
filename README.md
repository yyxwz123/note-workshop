# 笔记工坊 Note-Workshop

面向在校学生的读书笔记社区（云屋软件后端三面项目）。后端 Spring Boot + MyBatis-Plus + MySQL + JWT，前端 Vue 3（Vue CLI），包含用户、笔记、点赞、评论、关注、审核、管理后台与 Spring AI 阅读助手。

## 技术栈

| 层 | 选型 |
|---|---|
| 后端 | Java 21（本机 JDK 25 运行）、Spring Boot 3.5.16、MyBatis-Plus 3.5.17 |
| 数据库 | MySQL 8.4.9（utf8mb4） |
| 鉴权 | JWT（jjwt 0.12.6）+ HandlerInterceptor + BCrypt |
| AI | Spring AI 1.1.8（OpenAI 兼容接口，默认接 DeepSeek） |
| 文档 | springdoc-openapi 2.8.9（Swagger UI + OpenAPI 3.0 YAML） |
| 前端 | Vue 3 + vue-router 4 + axios（Vue CLI 5，端口 8081） |
| 构建 | Maven 3.9.16 / npm |

## 功能清单

**基础功能**

- 注册 / 登录，密码 BCrypt 加密，JWT 鉴权、登录拦截（未登录 401）
- 个人资料修改（昵称、简介、头像），头像/配图上传（本地存储，格式与大小校验）
- 笔记增删改查：必须绑定图书名称，支持私有/公开、多图、分页
- 仅作者本人（管理员）可编辑/删除
- 点赞 / 取消点赞、点赞数、点赞排行、我点赞的笔记（分页）
- 统一响应与全局异常处理、SLF4J 日志（登录、上传、AI、重要业务）

**进阶功能**

- 公开笔记审核流：提交 → 待审核 → 通过/驳回（带原因）→ 修改后重新提交
- 管理后台：数据概览、用户启用/禁用、笔记审核/下架、评论删除、AI 调用统计
- 社区：关注/取关、粉丝与关注列表、作者主页、热门作者榜
- 评论：一级评论 + 二级回复，父评论删除级联逻辑删除，管理员可删违规评论
- 连接池（HikariCP）、分页插件、接口文档与自动化测试脚本

**AI（加分项）**

- 阅读辅助：一键总结、适宜人群推荐、笔记评分（完整性/相关性/思考深度）
- AI 结果不会直接写入笔记，需用户手动「保存」，一篇笔记只保留一条 AI 结果
- 智能客服：多轮会话、会话隔离、滑动窗口（默认最近 20 条消息）、历史持久化
- 所有 AI 调用写入 `ai_call_log`，管理后台统计成功/失败次数
- 未配置 API Key 时返回 503 并给出提示，不影响其他功能

## 界面预览

| 首页 | 笔记详情 |
|---|---|
| ![首页](docs/screenshots/home.png) | ![笔记详情](docs/screenshots/note-detail.png) |

| AI 助手 | 管理后台 |
|---|---|
| ![AI 助手](docs/screenshots/ai.png) | ![管理后台](docs/screenshots/admin.png) |

## 目录结构

```
note-workshop
├─ pom.xml
├─ sql/schema.sql               全量建表脚本
├─ sql/upgrade_v2.sql           V1 → V2 升级脚本
├─ docs/
│  ├─ openapi.yaml              OpenAPI 3.0（可导入 Apifox）
│  └─ api-test-report.md        接口测试报告
├─ scripts/api-test.mjs         全量接口测试（Node 22）
├─ frontend/                    Vue 3 前端（Vue CLI）
└─ src/main/java/com/noteworkshop
   ├─ common/                   统一响应、分页、异常处理
   ├─ config/                   MyBatis-Plus、CORS/拦截器、OpenAPI、初始化管理员
   ├─ security/                 JWT、登录拦截器、管理员拦截器、用户上下文
   ├─ user/ note/ comment/ follow/ admin/ ai/ file/
   └─ resources/static/index.html  旧版单页（保留，可删除）
```

## 快速开始

### 1. 数据库

```powershell
start-mysql
mysql -u root -p123456 < sql/schema.sql
```

已有 V1 库时执行 `sql/upgrade_v2.sql`。

### 2. 启动后端

```powershell
mvn spring-boot:run
# 或
mvn clean package -DskipTests
java -jar target/note-workshop-1.0.0.jar
```

- 后端：<http://127.0.0.1:8080>
- Swagger UI：<http://127.0.0.1:8080/swagger-ui.html>
- OpenAPI JSON：`/v3/api-docs`，YAML：`/v3/api-docs.yaml`

### 3. 启动前端

```powershell
cd frontend
npm install
npm run serve      # http://127.0.0.1:8081
```

前端通过 `vue.config.js` 的 devServer 代理把 `/api`、`/uploads` 转发到 8080。

生产构建：

```powershell
npm run build      # 产物在 frontend/dist
```

## 默认账号

| 角色 | 账号 | 密码 |
|---|---|---|
| 管理员 | `admin` | `admin123`（首次启动自动创建） |
| 普通用户 | `demo01` | `123456` |

## AI 配置

通过环境变量注入，**不要写进配置文件或提交仓库**：

```powershell
$env:AI_API_KEY="sk-xxxx"                       # 必填
$env:AI_BASE_URL="https://api.deepseek.com"     # 可选，默认 DeepSeek
$env:AI_MODEL="deepseek-chat"                   # 可选
$env:AI_ENABLED="true"                          # 可选，false 时关闭 AI
```

未配置时 AI 接口返回 `503`，前端会提示「AI 未配置」，其余功能正常。

## 接口文档与 Apifox

- 在线文档：<http://127.0.0.1:8080/swagger-ui.html>
- 离线文件：[docs/openapi.yaml](docs/openapi.yaml)

**导入 Apifox**：打开 Apifox → 项目设置 → 导入数据 → OpenAPI/Swagger → 选择 `docs/openapi.yaml` → 导入。
或使用 URL 导入：`http://127.0.0.1:8080/v3/api-docs.yaml`（需后端运行）。
导入后先在「环境」里配置 `baseUrl = http://127.0.0.1:8080`，再调用登录接口拿到 token 填入 Bearer 鉴权。

## 测试

```powershell
# 1) 接口测试（后端启动后执行，覆盖 56 个用例）
node scripts/api-test.mjs

# 2) 页面渲染检查（前端 dev server 启动后执行，真实浏览器 + 控制台报错检查）
node scripts/ui-check.mjs

# 3) 真实用户流程联调（表单登录 → 发布笔记 → 校验待审核状态）
node scripts/ui-flow.mjs
```

- 接口测试结果：[docs/api-test-report.md](docs/api-test-report.md)
- 页面检查截图：`.ui-check/shots/`（home / login / detail / editor / mine / profile / ai / admin 共 10 张）

## 数据库表

`user`、`note`、`note_image`、`note_like`、`comment`、`follow`、`note_ai`、`ai_call_log`、`ai_chat_session`、`ai_chat_message`。

## 注意

- `application.yml` 中的数据库密码、JWT 密钥仅用于本地开发，生产请用环境变量。
- 上传文件存放在 `uploads/`，已加入 `.gitignore`。
- JDK 23+ 默认关闭隐式注解处理，`pom.xml` 已显式配置 Lombok `annotationProcessorPaths`。
- 本机 MySQL 为免安装版，重启电脑后执行 `start-mysql` 启动。
