# Day 3 · 互动与管理后台

> 目标：讲清点赞为什么不会重复、评论树怎么建怎么删、关注怎么统计、后台权限怎么防。
> 时间：上午 2h · 下午 2h · 晚上 1h
> 配套：[五日计划](../五日答辩学习计划.md) · [代码解析](../项目代码解析.md) · [题库](../答辩题库.md)

---

## 0. 今天要解决的三个问题

1. 两个人同时点赞，计数会不会错？怎么保证不重复？
2. 一条评论有 5 条回复，删了它，回复怎么办？
3. 管理员和普通用户的边界，代码里在哪一刀切开？

---

## 1. 知识点详解

### 1.1 点赞为什么要"唯一索引 + 先查"

**通俗解释**：点赞就像在签到表上签名，一个人只能签一次。

- 业务层：先查有没有点过，点过就取消；
- 数据库层：`(user_id, note_id)` 唯一索引，**兜底**——即使并发重复插入，也只会成功一条。

**为什么两层都要**：只靠查询，两个请求同时判断"没点过"会都插入；只靠索引，重复插入会抛异常需要捕获。两层配合最稳。

### 1.2 计数为什么用 `like_count = like_count + 1`

**错误写法**：

```sql
-- 先查
SELECT like_count FROM note WHERE id=1;  -- 得到 10
-- 再写
UPDATE note SET like_count = 11;
```

两个并发请求都读到 10，都写 11 → 少了 1 次。

**正确写法**：

```sql
UPDATE note SET like_count = like_count + 1 WHERE id = 1;
```

数据库对该行加锁、在内部完成加法，不会丢更新。取消时用 `GREATEST(like_count-1, 0)` 防止负数。

**追问**："这样是不是强一致？"——单行更新是原子的，但"点赞记录"和"计数"两个操作在同一事务里才一致；极端并发仍可能因先查后改产生竞态，可改 `INSERT ... ON DUPLICATE KEY` 或 Redis 计数。

### 1.3 冗余计数：拿空间换时间

列表页要显示点赞数、要按点赞排序。如果每次 `count(*)` 扫 `note_like`，数据量大就慢。

所以在 `note` 表冗余 `like_count`、`comment_count`：读快，写时要同步维护。

**代价**：可能不一致，需要定期校准（`UPDATE note n SET like_count=(SELECT count(*) FROM note_like l WHERE l.note_id=n.id)`）。

### 1.4 评论树：邻接表 + 一次查询建树

**存储**：`comment.parent_id` 指向父评论，0 表示一级评论。这叫**邻接表**，简单、写入快。

**查询**（`CommentService.listByNote`）：

1. 一次查出该笔记所有 `deleted=0` 的评论；
2. 按 `parentId` 分组；
3. 把子节点挂到父节点的 `children` 上。

**为什么不递归查库**：每条评论查一次子评论 = N+1 次查询，10 条评论 11 次 SQL，慢且难控。

**代价**：一次把整篇笔记的评论读进内存，超大评论区要改分页或路径枚举。

### 1.5 级联删除：BFS 收集 + 一条 UPDATE

需求：删父评论，子评论也要删（逻辑删除）。

**算法**（`CommentService.removeCascade`）：

1. 查出该笔记所有未删除评论；
2. 建 `parentId → 子评论列表` 的邻接表；
3. 从被删评论开始 BFS，收集所有子孙 id；
4. `UPDATE comment SET deleted=1 WHERE id IN (...)`；
5. `comment_count` 减去删除条数，`GREATEST(...,0)` 防负。

**为什么逻辑删除**：保留审计痕迹，回复关系不断链；查询统一带 `deleted=0`。

**为什么不用数据库外键 `ON DELETE CASCADE`**：外键是物理删除，且分库分表/逻辑删除场景不适用；业务层控制更灵活。

### 1.6 关注：多对多与唯一索引

- 一个用户关注多个人，也被多个人关注 → 多对多；
- 用 `follow(follower_id, followee_id)` 中间表；
- 唯一索引防重复关注；业务上禁止关注自己。

**粉丝数**：`count(*) where followee_id = ?`；
**我的关注**：`where follower_id = ?`；
**热门作者**：按 `followee_id` 分组计数倒序取前 10。

### 1.7 排行榜 SQL 与 N+1

```sql
SELECT followee_id, count(*) AS cnt
FROM follow
GROUP BY followee_id
ORDER BY cnt DESC
LIMIT 10;
```

拿到 10 个 id 后，**一次** `selectByIds` 查用户，再按原顺序组装——避免"循环里查用户"的 N+1。

### 1.8 管理后台：两道门

```
请求 /api/admin/**
  → AuthInterceptor（有没有登录）
  → AdminInterceptor（是不是管理员，查库）
  → AdminController
```

**为什么查库而不是信 token 里的角色**：管理员被降权后，旧 token 里的 role 还是 ADMIN；查库能立刻生效。

**再加一层业务校验**：审核接口要求"当前状态必须是待审核"，防止重复审核或直接把已发布笔记改状态。

### 1.9 索引与 EXPLAIN

建索引的依据是**查询**，不是字段好看。

| 索引 | 服务的查询 |
| --- | --- |
| `note(is_public,status,like_count)` | 公开流 + 最热排序 |
| `note_like(user_id,note_id)` 唯一 | 是否点过 + 我的点赞 |
| `comment(note_id,deleted)` | 某篇笔记的评论 |
| `follow(follower_id,followee_id)` 唯一 | 关注关系 |
| `note_ai(note_id)` 唯一 | 一篇一条 AI 结果 |

用 `EXPLAIN` 看是否走索引：`key` 列有值、`rows` 小、`Extra` 不出现 `Using filesort`（排序也能用上索引最好）。

### 1.10 事务边界

- 点赞：删/插记录 + 更新计数 → 同一个事务；
- 审核：改状态 + 写审核时间 → 同一个事务；
- 评论删除：批量逻辑删除 + 计数 → 同一个事务。

**注意**：事务里不要做远程调用（AI、OSS），否则连接被长时间占用。本项目的 AI 调用**故意不加事务**。

---

## 2. 代码逐行读

### 2.1 点赞

文件：`src/main/java/com/noteworkshop/note/NoteService.java:145-178`

```java
public Map<String, Object> toggleLike(Long userId, Long noteId) {
    Note note = noteMapper.selectById(noteId);
    if (note == null) throw new BizException(404, "笔记不存在");
    if (note.getIsPublic() != 1 || note.getStatus() != STATUS_NORMAL)
        throw new BizException(400, "只能点赞公开且审核通过的笔记");   // 1. 业务前置条件

    Long exists = likeMapper.selectCount(... userId ... noteId ...);  // 2. 查是否已点赞
    boolean liked;
    if (exists > 0) {
        likeMapper.delete(...);                                        // 3. 取消：删记录
        noteMapper.update(null, ...setSql("like_count = GREATEST(like_count - 1, 0)"));
        liked = false;
    } else {
        NoteLike like = new NoteLike();
        like.setUserId(userId); like.setNoteId(noteId);
        likeMapper.insert(like);                                       // 4. 点赞：插记录
        noteMapper.update(null, ...setSql("like_count = like_count + 1"));
        liked = true;
    }
    Note latest = noteMapper.selectById(noteId);
    return Map.of("liked", liked, "likeCount", latest.getLikeCount()); // 5. 返回最新状态
}
```

**要点**：

- 第 1 步：私有/待审核的笔记不能点赞，防止绕过审核互动；
- 第 3/4 步：删除/插入 + 计数必须在同一事务（方法上有 `@Transactional`）；
- 第 5 步：返回数据库里的真实计数，避免前端自己加减算错。

### 2.2 级联删除

文件：`src/main/java/com/noteworkshop/comment/CommentService.java:125-150`

```java
private void removeCascade(Comment root) {
    List<Comment> all = commentMapper.selectList(... noteId ... deleted=0 ...);
    Map<Long, List<Comment>> childrenMap = all.stream()
            .collect(Collectors.groupingBy(c -> c.getParentId() == null ? 0L : c.getParentId()));

    Set<Long> toDelete = new HashSet<>();
    Deque<Long> queue = new ArrayDeque<>();
    queue.add(root.getId());
    toDelete.add(root.getId());
    while (!queue.isEmpty()) {                    // BFS：一层层往下找
        Long current = queue.poll();
        for (Comment child : childrenMap.getOrDefault(current, List.of())) {
            if (toDelete.add(child.getId())) queue.add(child.getId()); // 去重，防环
        }
    }
    commentMapper.update(null, ...in(id, toDelete).set(deleted, 1));   // 一条 SQL 全删
    noteMapper.update(null, ...comment_count = GREATEST(comment_count - N, 0));
}
```

**要点**：

- 用 `Set` 去重，避免脏数据形成环导致死循环；
- 一条 `UPDATE ... IN` 比循环 N 次 update 快得多；
- 计数用 `GREATEST` 兜底，防并发下减成负数。

---

## 3. 动手任务

### 任务 A：并发点赞实验（30 分钟）

用 PowerShell 并发打 20 次点赞（同一个用户）：

```powershell
$token = "<demo01 的 token>"
1..20 | ForEach-Object -Parallel {
    Invoke-RestMethod -Uri "http://127.0.0.1:8080/api/notes/1/like" -Method Post -Headers @{Authorization="Bearer $using:token"}
} -ThrottleLimit 10
```

然后查：

```sql
SELECT like_count FROM note WHERE id=1;
SELECT count(*) FROM note_like WHERE note_id=1;
```

**预期**：两个数字一致（同一用户来回切换，最终不是 0 就是 1）。

### 任务 B：评论树与级联（40 分钟）

1. 发一条一级评论 A；
2. 回复 A 两条（B、C）；
3. 回复 B 一条（D）；
4. 删除 A；
5. 查：

```sql
SELECT id,parent_id,deleted FROM comment WHERE note_id=1;
SELECT comment_count FROM note WHERE id=1;
```

**预期**：A/B/C/D 全部 `deleted=1`，`comment_count` 正确减少。

### 任务 C：关注与排行榜（30 分钟）

```sql
SELECT follower_id, followee_id FROM follow;
SELECT followee_id, count(*) cnt FROM follow GROUP BY followee_id ORDER BY cnt DESC;
```

再调 `GET /api/public/authors/hot?limit=10` 对比结果。

### 任务 D：后台越权（20 分钟）

1. 普通用户 token 调 `/api/admin/dashboard` → 403；
2. admin token 调 → 200；
3. 用 admin 禁用某个普通用户 → 该用户登录返回 403；
4. 尝试禁用 admin 自己 → 返回 400。

---

## 4. 常见误区

| 误区 | 纠正 |
| --- | --- |
| 点赞用"先查再 +1"更新计数 | 并发会丢更新，要用 SQL 自增 |
| 认为唯一索引只是"防重复" | 也加速"是否点过/我的点赞"查询 |
| 评论树递归查库 | N+1，慢；本项目一次查全量内存组装 |
| 级联删除用物理删除 | 破坏审计与回复链，本项目逻辑删除 |
| 管理员权限只看 token | 角色变更不生效，要查库 |
| 排行榜循环查用户 | N+1，要批量查再组装 |

---

## 5. 今日自测（8 题）

**Q1** 点赞为什么要唯一索引 + 先查两层保险？

<details><summary>参考答案</summary>

先查处理业务（已赞则取消）；唯一索引兜底并发重复插入，保证数据不重复。
</details>

**Q2** 为什么 `like_count = like_count + 1` 不会丢更新？

<details><summary>参考答案</summary>

数据库对行加锁并在内部完成加法，两个并发请求串行执行，不会都基于旧值覆盖。
</details>

**Q3** 评论树为什么一次查全量？代价是什么？

<details><summary>参考答案</summary>

避免 N+1；代价是评论特别多时内存与传输开销大，需要分页或路径枚举优化。
</details>

**Q4** 级联删除的 BFS 为什么要用 Set？

<details><summary>参考答案</summary>

去重并防止脏数据形成环导致死循环。
</details>

**Q5** 逻辑删除相比物理删除的好处？

<details><summary>参考答案</summary>

保留审计痕迹、回复关系不断链、可恢复；代价是查询都要带 `deleted=0`。
</details>

**Q6** 热门作者 SQL 怎么避免 N+1？

<details><summary>参考答案</summary>

先 `GROUP BY` 拿到 top10 的 id 与计数，再 `selectByIds` 一次查用户，按原顺序组装。
</details>

**Q7** 管理员权限为什么查库而不是读 token？

<details><summary>参考答案</summary>

token 签发后角色可能被修改，查库能立即生效，避免旧 token 继续拥有管理员权限。
</details>

**Q8** `(is_public,status,like_count)` 的最左前缀怎么用？

<details><summary>参考答案</summary>

查询条件必须包含前两列 `is_public`、`status`，第三列用于排序；只查 `like_count` 用不上。
</details>

---

## 6. 今日复盘

```markdown
## Day 3 复盘
- 能白板写出的：级联删除 BFS
- 并发实验结论：
- 仍未理解的索引：
```

**明天预告**：Spring AI 调用链、会话隔离、Vue 前端架构与联调测试。
