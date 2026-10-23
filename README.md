# 笔记工坊 Note-Workshop

面向在校学生的读书笔记社区（云屋软件后端三面项目）。当前为 **V1 基础版骨架**，已实现用户、笔记、点赞、图片上传与 JWT 鉴权，可直接跑通前后端。

## 技术栈

| 层 | 选型 |
|---|---|
| 语言 / 运行时 | Java 21（本机 JDK 25 编译运行） |
| 框架 | Spring Boot 3.5.16 |
| ORM | MyBatis-Plus 3.5.17 |
| 数据库 | MySQL 8.4.9 |
| 鉴权 | JWT（jjwt 0.12.6）+ 拦截器 + BCrypt |
| 构建 | Maven 3.9.16 |
| 前端 | 原生 HTML/CSS/JS（`src/main/resources/static/index.html`） |

## 目录结构

```
note-workshop
├─ pom.xml
├─ sql/schema.sql                  建表脚本
└─ src/main
   ├─ java/com/noteworkshop
   │  ├─ NoteWorkshopApplication.java
   │  ├─ common/                   Result / PageResult / 业务异常 / 全局异常处理
   │  ├─ config/                   MyBatis-Plus 分页、MVC 拦截器与静态资源映射、JWT 配置
   │  ├─ security/                 JwtUtil / 登录拦截器 / ThreadLocal 用户上下文
   │  ├─ user/                     注册、登录、个人资料
   │  ├─ note/                     笔记 CRUD、公开流、点赞
   │  └─ file/                     本地图片上传
   └─ resources
      ├─ application.yml
      └─ static/index.html         单页前端（登录、发布、列表、点赞）
```

## 快速开始

### 1. 启动 MySQL

```powershell
start-mysql
```

### 2. 建表

```powershell
mysql -u root -p123456 < sql/schema.sql
```

（库名 `note_workshop`，字符集 utf8mb4）

### 3. 启动项目

```powershell
mvn spring-boot:run
```

浏览器打开 <http://127.0.0.1:8080>，先注册再登录即可发布笔记。

### 4. 打包

```powershell
mvn clean package -DskipTests
java -jar target/note-workshop-1.0.0.jar
```

## 接口清单

| 方法 | 路径 | 说明 | 鉴权 |
|---|---|---|---|
| POST | `/api/auth/register` | 注册 | 否 |
| POST | `/api/auth/login` | 登录，返回 token | 否 |
| GET | `/api/users/me` | 当前用户 | 是 |
| PUT | `/api/users/me` | 修改昵称/简介/头像 | 是 |
| POST | `/api/files/upload` | 上传图片，返回 URL | 是 |
| POST | `/api/notes` | 新建笔记 | 是 |
| PUT | `/api/notes/{id}` | 编辑笔记（仅作者） | 是 |
| DELETE | `/api/notes/{id}` | 删除笔记（仅作者） | 是 |
| GET | `/api/notes/mine` | 我的笔记（分页） | 是 |
| GET | `/api/notes/liked` | 我点赞的（分页） | 是 |
| GET | `/api/notes/{id}` | 笔记详情 | 是 |
| POST | `/api/notes/{id}/like` | 点赞 / 取消点赞 | 是 |
| GET | `/api/public/notes` | 公开笔记流（分页，`sort=latest/hot`） | 否 |
| GET | `/api/public/notes/{id}` | 公开笔记详情 | 否 |
| GET | `/api/public/health` | 健康检查 | 否 |

请求头：`Authorization: Bearer <token>`。

统一响应：

```json
{ "code": 0, "message": "ok", "data": {} }
```

`code` 非 0 时 `message` 为错误原因（400 参数/业务错误、401 未登录、403 无权限、404 不存在、500 系统异常）。

## 已实现的功能点

- 注册 / 登录，密码 BCrypt 哈希存储，用户名唯一
- JWT 签发与拦截器校验，未登录访问受保护接口返回 401
- 个人资料修改（昵称、简介、头像 URL）
- 笔记增删改查，必须绑定图书名称；私有/公开切换
- 仅作者本人可编辑、删除
- 我的笔记分页；公开笔记流分页（最新 / 最热）
- 多图上传（本地存储，限制 jpg/jpeg/png/gif/webp，单文件 10MB）
- 点赞 / 取消点赞，点赞数排行，我点赞的笔记分页
- 统一异常处理 + SLF4J 日志
- 单页前端：登录、发布、列表、点赞、删除

## 待完成（进阶 / 加分项）

- 管理员后台（用户管理、笔记审核、下架、评论管理）
- 评论与二级回复、关注与粉丝排行
- Spring AI 阅读助手（总结 / 人群推荐 / 评分 / 客服），需环境变量注入 API Key
- 对象存储（OSS）替换本地存储
- Swagger / Apifox 接口文档

## 注意

- `application.yml` 中的数据库密码、JWT 密钥仅用于本地开发；生产环境请改用环境变量注入。
- 上传目录默认为项目下的 `uploads/`，已在 `.gitignore` 中忽略。
- JDK 23+ 默认关闭隐式注解处理，`pom.xml` 已显式配置 Lombok 的 `annotationProcessorPaths`。
