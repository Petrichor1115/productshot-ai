# T14 · 会话内聊天消息流水

> 状态：⬜ Todo ｜ 优先级：P1（作业要求缺口）｜ 阶段：v1.1 数据层
> 依赖：T04 ｜ 来源：T04 遗留项 · `作业要求.md` 明确要求"能看到所有的聊天内容"
> 规格状态：v1.1 规划，PRD v2.1 未覆盖

## 1. 目标

新增 `messages` 表记录会话内每一轮用户输入与 AI 输出，使管理端可查看完整聊天内容，用户端可回溯历史对话。

## 2. 背景与范围

**问题**：v1.0 只存"生成结果"，不存对话过程。作业要求管理端"能看到所有的聊天内容"，当前只能由生图记录近似满足，看不到用户自然语言输入与系统中间输出。

**在范围内**
- `messages` 表：role（user / assistant / system）、content、图片路径、创建时间
- 每次发送与每次生成完成后各写一条
- `GET /api/sessions/:id/messages` 返回会话完整流水
- 管理端会话记录可下钻查看聊天详情
- 用户端切换会话时展示历史对话

**明确排除**
- 富文本 / Markdown 渲染 → 纯文本与图片
- 消息编辑、重新生成上下文回溯 → v1.2
- 消息全文检索 → v1.2（量大后再做）

## 3. 前置依赖

- T04（会话与隔离）

## 4. 任务清单

- [ ] 建 `messages` 表 + `session_id` / `created_at` 索引
- [ ] 用户发送时写 user 消息（含文本与图片路径 JSON）
- [ ] 生成完成后写 assistant 消息（含结果摘要与图片路径）
- [ ] `GET /api/sessions/:id/messages`，带归属校验
- [ ] 删除会话时级联清理 messages
- [ ] 管理端"会话记录"行点击 → 侧滑/弹窗展示聊天流水
- [ ] 用户端切换会话渲染历史对话列表

## 5. 关键实现

```sql
CREATE TABLE IF NOT EXISTS messages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,
  role       TEXT    NOT NULL,            -- user / assistant / system
  content    TEXT,                         -- 文本内容
  images     TEXT,                         -- 图片路径数组 JSON
  created_at TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);
```

**写入时机**：发送即写 user 消息（不等生成结果），保证网络中断时用户的输入不丢失。

## 6. 涉及文件

| 文件 | 操作 |
|------|------|
| `schema.sql` | 新增 messages 表 |
| `server.js` | 消息读写接口 |
| `public/js/workspace.js` | 历史对话渲染 |
| `public/js/admin.js` | 聊天详情查看 |

## 7. 验收标准（AC）

1. 一轮完整交互后，数据库有 user 与 assistant 各一条记录。
2. 生成失败时也保留 user 消息与失败说明。
3. 切换会话能完整还原历史对话，含图片。
4. 管理端可查看任意用户的任意会话聊天内容。
5. 删除会话后 messages 无残留。
6. 越权访问他会话消息返回 404。

## 8. 验证计划（待执行）

| 项 | 状态 |
|----|------|
| 消息落库 | ⬜ |
| 历史还原 | ⬜ |
| 管理端下钻 | ⬜ |
| 级联清理 | ⬜ |

## 9. 风险与决策

| 决策 | 原因 |
|------|------|
| 发送即写 user 消息 | 保证用户输入不因生成失败而丢失 |
| 消息存图片路径而非二进制 | 与 generations 一致，避免库膨胀 |
| 不做全文检索 | v1.1 数据量小，避免引入额外依赖 |

## 10. 遗留 / 后续

- 消息编辑、上下文回溯重生成、全文检索 → v1.2。
