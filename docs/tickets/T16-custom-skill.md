# T16 · 用户自定义 Skill

> 状态：⬜ Todo ｜ 优先级：P1（作业要求）｜ 阶段：v1.1 能力扩展
> 依赖：T06 ｜ 来源：`作业要求.md` 明确要求"用户可以基于自己的聊天绘画萃取创建自己的 skill"
> 规格状态：v1.1 规划，PRD v2.1 中列为悬空项

## 1. 目标

让用户能基于已有会话沉淀出自己的 Skill（风格模板），并能在后续生成时选用；同时区分系统内置 Skill 与用户 Skill 的存储与可见范围。

## 2. 背景与范围

**问题**：v1.0 只有内置的商品套图模板，用户无法沉淀自己的风格偏好。作业要求明确提出"萃取创建自己的 skill"与"user skill / system skill 分开存放"。

**在范围内**
- 目录分层：`skills/system/`（内置只读）与 `skills/users/{userId}/`（用户私有）
- 从会话"另存为 Skill"：抽取风格、补充信息、提示词骨架
- `GET / POST / DELETE /api/skills`（用户只能见 system + 自己的）
- 生成时可选 Skill，覆盖默认模板
- Skill 校验：名称唯一、模板变量合法

**明确排除**
- Skill 市场 / 分享与交易 → v1.2
- 用自然语言让 AI 自动生成 Skill（作业提及）→ 拆出，见下
- Skill 版本管理与回滚 → v1.2

## 3. 前置依赖

- T06（模板渲染机制）

## 4. 任务清单

- [ ] 目录重构：内置模板迁入 `skills/system/`，新建 `skills/users/`
- [ ] 建 `skills` 表：id / user_id(可空=system) / name / type / config JSON / created_at
- [ ] `GET /api/skills`：返回 system 全量 + 当前用户的私有 Skill
- [ ] `POST /api/skills`：从会话参数萃取并保存，同名拒绝
- [ ] `DELETE /api/skills/:id`：仅能删自己的，system 不可删
- [ ] 生成接口新增 `skillId` 入参，优先用指定 Skill 模板
- [ ] 前端 Skill 选择器与"另存为 Skill"入口
- [ ] 越权防护：访问他人 Skill 返回 404

## 5. 关键实现

```js
// 可见范围：system 全量 + 本人私有，SQL 层面收敛
const sql = `SELECT * FROM skills WHERE user_id IS NULL OR user_id = ? ORDER BY user_id NULLS FIRST, created_at`;

// 删除保护：system skill 的 user_id 为 NULL，直接拒绝
if (row.user_id === null) return res.status(403).json({ error: '内置 Skill 不可删除' });
```

**萃取策略**：从会话读取 `style` + `supplement` + 上次生成的 `prompt`，组装为 `{ styleKeywords, supplement, promptTpl }`，再由用户确认命名后保存。

## 6. 涉及文件

| 文件 | 操作 |
|------|------|
| `skills/` | 目录重构（system / users） |
| `schema.sql` | 新增 skills 表 |
| `server.js` | 新增 `/api/skills*` |
| `public/js/workspace.js` | Skill 选择与另存 |

## 7. 验收标准（AC）

1. 用户 A 看不到用户 B 的私有 Skill，能看到全部 system Skill。
2. 从会话另存为 Skill 后，新会话可直接选用并生效。
3. 选用自定义 Skill 生成的图与其沉淀的风格一致。
4. 删除私有 Skill 正常；删除 system Skill 被拒。
5. 同名 Skill 创建被拒并提示。
6. 越权访问他人 Skill 返回 404。

## 8. 验证计划（待执行）

| 项 | 状态 |
|----|------|
| 目录与读写隔离 | ⬜ |
| 萃取保存与复用 | ⬜ |
| 越权与删除保护 | ⬜ |

## 9. 风险与决策

| 决策 | 原因 |
|------|------|
| Skill 存库而非仅存文件 | 需按用户隔离与分页查询，纯文件难做权限 |
| system 用 `user_id IS NULL` 标记 | 一条 SQL 表达"全局可见"，避免冗余字段 |
| 自然语言生成 Skill 拆出 | 依赖意图理解与多轮确认，独立为后续 ticket 更可控 |

## 10. 遗留 / 后续

- **自然语言创建 Skill**（作业提及）→ 建议独立 ticket，需设计多轮确认交互。
- Skill 分享、版本管理 → v1.2。
