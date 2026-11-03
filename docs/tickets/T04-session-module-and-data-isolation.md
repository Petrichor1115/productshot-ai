# T04 · 会话模块与数据隔离

> 状态：✅ Done ｜ 优先级：P0 ｜ 阶段：S3 业务能力
> 执行时间：2026-10-26 17:24 – 17:35（约 11 min）
> 依赖：T01、T02 ｜ 关联文档：`docs/prd/PRD.md` §6.2 sessions 表 · `pages/用户端-工作台.md` §3.2.3

## 1. 目标

实现绘画会话的创建、列表、详情、删除，保证用户间会话严格隔离，并承载 v2.0 四个扩展字段（多图、补充信息、组图类型、风格）的读写。

## 2. 背景与范围

**在范围内**
- `GET / POST / DELETE /api/sessions`，`GET /api/sessions/:id`
- 会话归属校验：只能操作自己的会话
- `original_images` / `shot_types` 两个 JSON 字段的序列化与反序列化
- 删除会话级联清理该会话下的生成记录

**明确排除**
- 会话重命名、置顶、搜索 → 悬空
- 会话内聊天消息流水存储 → 当前以"生成记录"代替，聊天流水记为 v1.1

## 3. 前置依赖

- T01（数据层）、T02（JWT 身份）

## 4. 任务清单

- [x] `POST /api/sessions`：校验 name 非空，写入 user_id
- [x] `GET /api/sessions`：按当前用户过滤，按创建时间倒序
- [x] `GET /api/sessions/:id`：返回含 4 个扩展字段的完整详情
- [x] `DELETE /api/sessions/:id`：先校验归属，再删会话与其下 generations
- [x] JSON 字段统一 helper：`toJson()` / `fromJson()`，空值安全
- [x] 所有写操作后 `persist()` 落盘

## 5. 关键实现

```js
// 归属校验：所有单条操作都带 user_id 条件，杜绝越权
db.run('DELETE FROM sessions WHERE id = ? AND user_id = ?', [id, req.user.id]);

// JSON 字段安全解析
const fromJson = (v, fallback) => {
  if (!v) return fallback;
  try { return JSON.parse(v); } catch { return fallback; }
};
```

**隔离原则**：SQL 一律带 `user_id = ?` 条件，而非先查后判断，从语句层面杜绝 ID 遍历。

## 6. 涉及文件

| 文件 | 操作 |
|------|------|
| `server.js` | 新增 `/api/sessions*` 路由 |
| `schema.sql` | sessions 表四扩展字段（T01 已建） |

## 7. 验收标准（AC）

1. 用户 A 的会话列表中不出现用户 B 的任何会话。
2. 用 A 的 token 直接请求 B 的 `sessions/:id` → 404（不泄露存在性）。
3. 会话详情返回 `original_images` / `shot_types` 为数组，`supplement` / `style` 为字符串。
4. 删除会话后，其下 generations 记录一并清理，无孤儿数据。
5. 空会话（无图无参数）也能正常创建与返回。

## 8. 自测记录

| 场景 | 结果 |
|------|------|
| A/B 两账号会话互不可见 | ✅ |
| A 越权访问 B 会话详情 | ✅ 404 |
| 多图路径数组存取 | ✅ 9 条路径往返无损 |
| 删除级联 | ✅ generations 残留 0 条 |
| 非法 JSON 容错 | ✅ 返回默认值不崩溃 |

## 9. 风险与决策

| 决策 | 原因 |
|------|------|
| 越权返回 404 而非 403 | 避免通过状态码差异探测资源是否存在 |
| JSON 字段用 TEXT 存储 | SQLite 无原生数组；v1.0 无需按 JSON 内部字段查询 |
| 删除走级联而非软删 | 简化实现；如需审计在 v1.1 加 `deleted_at` |

## 10. 遗留 / 后续

- 会话内聊天消息流水未存储 → 管理端"查看聊天记录"（作业要求）当前由生图记录近似满足，v1.1 建议新增 `messages` 表。
- 无会话数量上限 → 防止单用户刷量时需补。
