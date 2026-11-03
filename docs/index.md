# 项目文档索引

本目录收录 ProductShot AI 从需求到实现的全部过程文档，按「需求 → 设计 → 拆解 → 打通」的顺序组织。

---

## 阅读路径（建议顺序）

1. [`requirements/原始需求记录.md`](./requirements/原始需求记录.md) — 项目起点：原始需求口述记录，定义交付边界
2. [`prd/PRD.md`](./prd/PRD.md) — 总 PRD：产品定位、角色、核心流程、非功能要求、目录与验收标准
3. [`prd/pages/`](./prd/pages/) — 4 份页面级 PRD：用户端登录页 / 用户端工作台 / 管理端登录页 / 管理端仪表盘
4. [`tickets/README.md`](./tickets/README.md) — 30 个开发 Ticket 的索引、依赖关系与完成状态
5. [`architecture/`](./architecture/) — 产品架构设计图、系统架构图、用户端架构图（可直接用浏览器打开）
6. [`integration/火山引擎方舟打通文档.md`](./integration/火山引擎方舟打通文档.md) — 火山引擎方舟接入的完整指南

---

## 目录说明

| 目录 | 内容 | 对应实现 |
|------|------|----------|
| `requirements/` | 原始需求记录（口述整理） | 全局 |
| `prd/` | 总 PRD + 4 份页面级 PRD | `public/` 页面、`db/schema.sql`、`src/` |
| `tickets/` | T01–T30 任务拆解，含依赖、验收标准与状态 | 全部代码 |
| `architecture/` | 架构图 HTML / PNG | `src/` 分层、前端结构 |
| `integration/` | 方舟大模型平台打通文档 | `src/services/ai/volcClient.js` |
| `tools/` | 数据库快照查看页（静态 HTML） | `scripts/db-inspect.js` |

---

## 说明

- **PRD 与 Ticket 是开发过程的真实产物**，保留了当时的版本号与状态标记；其中 T11–T30 属于后续迭代规划，
  部分能力（自定义 Skill、计费、异步任务中心等）在当前版本中未实现，仅作为演进方向记录。
- 架构图 HTML 为设计阶段产出，可直接用浏览器打开查看；`用户端架构图.png` 为其静态导出图。
- `tools/db-inspect.html` 是 `npm run db:inspect` 生成的数据库快照，数据为演示数据，仅用于查看表结构与样例记录。
- 仓库根目录的 `README.md` 提供产品定位、快速开始与 API 一览；本目录只负责过程文档。
