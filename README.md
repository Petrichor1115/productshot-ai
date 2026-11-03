# ProductShot AI · AI 商品套图生成器

> 上传一张商品原图，AI 自动生成电商「产品主图 / 使用场景 / 卖点介绍」三件套。
> 双端 Web 应用：用户端对话式工作台 + 管理端主控台，后端 Node.js + Express + SQLite，AI 对接火山引擎方舟。

<p>
  <img alt="Node" src="https://img.shields.io/badge/Node.js-%3E%3D22.5-339933?logo=node.js&logoColor=white">
  <img alt="Express" src="https://img.shields.io/badge/Express-4.x-000000?logo=express&logoColor=white">
  <img alt="SQLite" src="https://img.shields.io/badge/SQLite-node%3Asqlite-003B57?logo=sqlite&logoColor=white">
  <img alt="License" src="https://img.shields.io/badge/License-MIT-blue">
</p>

---

## 1. 项目定位

面向电商卖家的「套图生产工具」：卖家不需要懂摄影棚布光、也不需要会写提示词，只要上传商品图 + 几句补充信息，
系统会自动完成 **商品识别 → 卖点提炼 → 提示词拼装 → 批量出图 → 结果归档** 的完整链路。

产品同时提供两个端：

| 端 | 使用者 | 能力 |
|----|--------|------|
| 用户端 | 电商卖家 / 运营 | 对话式首页、套图生成子页、多会话隔离、历史结果回填、大图预览与下载 |
| 管理端 | 平台管理员 | 数据看板（用户/会话/出图量/今日量）、会话记录分页、生图记录分页与轮询 |

产品需求文档、页面级 PRD、30 个开发 Ticket 与架构图全部收录在 [`docs/`](./docs)，可从需求直接追溯到实现。

---

## 2. 功能一览

**用户端**

- 注册 / 登录 / 登出，JWT 鉴权，bcrypt 密码存储
- 会话（绘画）增删改查，会话之间数据完全隔离
- 商品原图上传：JPG / PNG / WEBP，单张 ≤10MB，单会话 ≤9 张，拖拽或点选
- 补充信息输入（≤500 字），组图类型三开关（主图 / 场景 / 卖点），4 种风格（简约 / 高级 / 自然 / 暗调）
- 一键生成套图：逐张落库，单张失败不影响其余，结果支持大图预览与下载
- 空态 / 加载态 / 失败态 / 成功态完整覆盖，进行中任务轮询刷新

**管理端**

- 管理员角色校验登录，左侧固定导航 + hash 路由四视图
- 数据看板：用户数、会话数、出图总量、今日出图量
- 会话记录：分页 20 条，5 个字段
- 生图记录：分页 20 条，7 个字段，缩略图大图预览，进行中任务 5s 轮询

**AI 与工程**

- 火山引擎方舟接入：豆包视觉理解提炼卖点 + Seedream 图生图
- 未配置 API Key 时自动降级为本地确定性渲染，全链路仍可完整演示（不伪装成真实 AI 出图）
- 分层架构：routes → services → repositories → db，统一响应结构与错误码
- 参数白名单校验、级联删除、越权防护、WAL + 外键 + CHECK 约束

---

## 3. 环境要求

| 项 | 要求 | 说明 |
|----|------|------|
| Node.js | **≥ 22.5**（推荐 24 LTS） | 数据库使用内置 `node:sqlite`，低版本会启动失败 |
| npm | ≥ 10 | 仅用于安装依赖 |
| 浏览器 | Chrome / Edge / Firefox 最新版 | 前端为原生 HTML/CSS/JS，无构建步骤 |
| 网络 | 可选 | 仅真实 AI 出图时需要访问火山引擎方舟 |

无需安装 MySQL / SQLite 等外部数据库：数据落在单文件 `data/productshot.db`。

---

## 4. 快速开始

```bash
# 1. 克隆
git clone https://github.com/Petrichor1115/productshot-ai.git
cd productshot-ai

# 2. 安装依赖
npm install

# 3. 准备环境变量（Windows 用 copy，macOS/Linux 用 cp）
copy .env.example .env

# 4. 启动服务
npm start
```

看到如下日志即启动成功：

```
[INFO] 数据库已就绪：.../data/productshot.db
[INFO] 管理员账号已就绪：admin
[INFO] ProductShot AI 服务已启动： http://localhost:3100
[INFO] 出图模式：local-mock
```

可选步骤：

```bash
npm run db:seed      # 灌入演示数据：demo01 用户 + 3 个会话 + 9 张套图
npm run test:smoke   # 端到端冒烟测试（需先启动服务）
npm run db:inspect   # 导出数据库快照到 docs/tools/db-inspect.html
```

### 访问入口

| 入口 | 地址 | 账号 |
|------|------|------|
| 用户端登录 | <http://localhost:3100/index.html> | `demo01` / `demo123`（执行 seed 后可用，也可自行注册） |
| 用户端工作台 | <http://localhost:3100/workspace.html> | — |
| 管理端登录 | <http://localhost:3100/admin.html> | `admin` / `admin123`（首次启动自动创建） |
| 管理端主控台 | <http://localhost:3100/admin-dashboard.html> | — |
| 健康检查 | <http://localhost:3100/api/health> | — |

---

## 5. 接入真实 AI 出图（可选）

默认 `.env.example` 中 `ARK_API_KEY` 为空，服务运行在 `local-mock` 模式：按所选风格把用户原图确定性合成到
1024×1024 版式（SVG），用于走通「上传 → 生成 → 落库 → 预览 → 下载 → 管理端记录」全链路。

配置火山引擎方舟密钥后**自动切换为真实出图，无需改代码**：

```env
ARK_API_KEY=ark-xxxxxxxx
ARK_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
ARK_VISION_MODEL=doubao-seed-1-6-vision
ARK_IMAGE_MODEL=doubao-seedream-5-0-pro
```

调用链路：`补充信息 + 原图 → 豆包视觉理解（名称/类目/3 条卖点）→ Skill 模板拼提示词 → Seedream 图生图 → 落盘`。
密钥获取、模型 ID、请求示例与排错见 [`docs/integration/火山引擎方舟打通文档.md`](./docs/integration/火山引擎方舟打通文档.md)。

---

## 6. 目录结构

```
productshot-ai/
├── server.js                     服务入口（端口监听、管理员初始化、优雅关闭）
├── package.json
├── .env.example                  环境变量模板（复制为 .env 使用）
├── data/                         SQLite 数据文件目录（运行时生成，.gitignored）
├── uploads/                      上传原图与生成结果（运行时生成，.gitignored）
│
├── db/
│   └── schema.sql                建表 SQL：字段注释 / 外键 / CHECK / 索引规划
├── src/                          ── 后端（分层）
│   ├── app.js                    应用装配：CORS / 静态资源 / 路由 / 兜底
│   ├── config/index.js           集中配置与业务常量
│   ├── core/                     统一响应 / 错误体系 / 日志 / 参数校验
│   ├── db/index.js               连接初始化（WAL + 外键）、事务包装
│   ├── repositories/             数据访问层（users / sessions / generations）
│   ├── services/                 业务层（auth / session / generate / admin）
│   │   └── ai/                   AI 出图模块（详见该目录 README）
│   ├── middleware/               JWT 鉴权、管理员鉴权、上传、统一错误处理
│   └── routes/                   REST 路由（auth / sessions / upload / generate / admin）
├── scripts/                      运维与验证脚本
│   ├── seed.js                   演示数据初始化
│   ├── smoke-test.js             端到端冒烟测试
│   └── db-inspect.js             数据库快照导出
├── skills/
│   └── product-shot-template.json  套图 Skill 模板（4 风格 × 3 组图提示词）
├── public/                       ── 前端（原生，无构建）
│   ├── index.html                用户端登录页
│   ├── workspace.html            对话式首页 + 套图生成子页（SPA 双视图）
│   ├── admin.html                管理端登录页
│   ├── admin-dashboard.html      管理端主控台（hash 路由四视图）
│   ├── css/                      tokens / base / components / user / admin
│   └── js/                       icons / api / auth / workspace / admin
└── docs/                         ── 项目文档（索引见 docs/index.md）
    ├── prd/                      总 PRD + 4 份页面级 PRD
    ├── tickets/                  30 个开发 Ticket 与索引
    ├── architecture/             产品 / 系统 / 用户端架构图
    ├── integration/              火山引擎方舟打通文档
    ├── requirements/             原始需求记录
    └── tools/                    数据库快照查看页
```

---

## 7. 整体架构

```
┌──────────────────────────────────────────────────────────────┐
│  浏览器                                                       │
│  用户端：index / workspace        管理端：admin / dashboard    │
│  原生 HTML + CSS + JS，无构建，fetch + JWT                     │
└───────────────────────────────┬──────────────────────────────┘
                                │  HTTP / JSON（统一 {code,message,data}）
┌───────────────────────────────▼──────────────────────────────┐
│  Express 应用（src/app.js）                                   │
│                                                              │
│  routes        auth / sessions / upload / generate / admin    │
│      ↓  参数校验 + 鉴权中间件（JWT / admin 角色）              │
│  services      auth / session / generate / admin              │
│      ↓        ai/imageGenerator ← 出图编排                    │
│  repositories  user / session / generation                    │
│      ↓                                                    │
│  db/index.js  node:sqlite（WAL + 外键 + 幂等建表 + 事务）      │
└───────────────────────────────┬──────────────────────────────┘
                                │
        ┌───────────────────────┴────────────────────────┐
        ▼                                                ▼
  data/productshot.db                             uploads/ 原图与成图
  users / sessions / generations                （静态目录 /uploads 对外提供）
```

出图编排内部：

```
补充信息 + 原图
   └─→ 豆包视觉理解（analyzeProduct）→ {名称, 类目, 3 条卖点}
          └─→ Skill 模板（skills/product-shot-template.json）拼装提示词
                 └─→ Seedream 图生图（generateImage）→ PNG 落盘
                        └─→ generations 表记录状态 / 耗时 / prompt 快照

未配置 ARK_API_KEY 或上游失败 → mockRenderer 本地渲染（SVG），链路不中断
```

技术选型说明：数据库选用 Node 内置 `node:sqlite`，零外部依赖、单文件落盘，适合本地一键跑通；
前端刻意不引入框架与构建工具，克隆后无需 `npm run build` 即可打开页面。

---

## 8. 数据库设计

| 表 | 说明 | 关键字段 |
|----|------|----------|
| `users` | 用户与管理员 | `username` UNIQUE、`password`(bcrypt)、`role` CHECK(user/admin)、`status` |
| `sessions` | 会话（绘画） | `user_id` FK CASCADE、`original_images`(JSON ≤9 张)、`supplement`、`shot_types`、`style` |
| `generations` | 生图明细 | `session_id` FK CASCADE、`gen_type`、`shot_type` CHECK、`status` CHECK 四态、`duration_ms` |
| `schema_migrations` | 迁移版本记录 | `version` PK |

索引规划（详见 [`db/schema.sql`](./db/schema.sql)）：

| 查询场景 | 命中索引 |
|----------|----------|
| 登录 `WHERE username=?` | `uk_users_username` |
| 用户端会话列表 | `idx_sessions_user_created (user_id, created_at DESC)` |
| 管理端会话分页 | `idx_sessions_created_at` |
| 会话历史结果 | `idx_generations_session_created` |
| 管理端生图记录分页 | `idx_generations_created_at` |
| 进行中轮询 / 失败率 | `idx_generations_status` |

一致性措施：外键 `ON DELETE CASCADE`（删除会话自动清理生图记录）、`CHECK` 兜底枚举、WAL 提升并发、写操作事务包装。

---

## 9. API 一览

统一响应 `{ code, message, data, timestamp }`，`code = 0` 表示成功。

| 方法 | 路径 | 说明 | 鉴权 |
|------|------|------|------|
| POST | `/api/auth/register` | 注册（用户名 3–20 位，密码 ≥6 位） | — |
| POST | `/api/auth/login` | 登录（可传 `role: 'admin'` 校验管理员） | — |
| GET | `/api/auth/me` | 当前用户信息 | JWT |
| POST | `/api/auth/logout` | 登出 | JWT |
| GET / POST | `/api/sessions` | 会话列表 / 新建会话 | JWT |
| GET | `/api/sessions/:id` | 会话详情（配置 + 历史结果） | JWT + 归属校验 |
| PATCH | `/api/sessions/:id` | 更新会话配置 | JWT + 归属校验 |
| DELETE | `/api/sessions/:id` | 删除会话（级联清理） | JWT + 归属校验 |
| POST | `/api/upload` | 上传商品主图（≤10MB，≤9 张） | JWT |
| POST | `/api/generate` | 生成套图 | JWT + 归属校验 |
| GET | `/api/admin/stats` | 数据看板 4 项指标 | JWT + admin |
| GET | `/api/admin/sessions` | 会话记录分页 | JWT + admin |
| GET | `/api/admin/records` | 生图记录分页 | JWT + admin |
| GET | `/api/health` | 健康检查（含当前出图模式） | — |

错误码：`1001` 参数错误 · `2001` 未认证 · `2002` 无权限 · `3001` 不存在 · `3002` 冲突 ·
`4001` 业务规则拒绝 · `5001` 服务异常 · `5002` AI 上游异常。

---

## 10. 文档索引

| 文档 | 内容 |
|------|------|
| [docs/index.md](./docs/index.md) | 文档总索引与阅读路径 |
| [docs/prd/PRD.md](./docs/prd/PRD.md) | 产品需求文档（含 4 份页面级 PRD） |
| [docs/tickets/](./docs/tickets/README.md) | 30 个开发 Ticket 的索引、状态与依赖 |
| [docs/architecture/](./docs/architecture/) | 产品架构图 / 系统架构图 / 用户端架构图 |
| [docs/integration/火山引擎方舟打通文档.md](./docs/integration/火山引擎方舟打通文档.md) | 方舟接入：密钥、模型 ID、请求示例、排错 |
| [src/services/ai/README.md](./src/services/ai/README.md) | AI 出图模块：双模式、调用链、扩展点 |
| [skills/README.md](./skills/README.md) | 套图 Skill 模板结构说明 |

---

## 11. 常见问题

| 现象 | 原因 | 处理 |
|------|------|------|
| 启动报 `node:sqlite` 相关错误 | Node 版本低于 22.5 | 升级 Node 到 ≥22.5 |
| 端口 3100 被占用 | 已有实例在跑 | 修改 `.env` 的 `PORT`，或结束占用进程 |
| 页面能开但接口 401 | Token 过期或未登录 | 重新登录 |
| 生成的图是 SVG 占位 | 未配置 `ARK_API_KEY`，处于降级模式 | 正常现象；配置 Key 后自动切换真实出图 |
| 真实出图报 401 / 404 | Key 无效或模型 ID 不对 | 按打通文档核对 `.env` |
| 数据库内容想清空 | 运行时产物 | 停止服务后删除 `data/productshot.db*`，重启自动重建 |

---

## 12. 说明

- `data/` 与 `uploads/` 为运行时目录，首次启动自动创建；仓库内仅保留 `.gitkeep`。
- `.env` 含密钥，已在 `.gitignore` 中排除，请勿提交。
- 设计阶段使用的第三方技能包（`ui-ux-pro-max`、`grill-me`、`grilling`）属于外部工具，未随本仓库发布。
- 演示用 JWT 密钥为开发默认值，生产环境请务必替换。

## License

[MIT](./LICENSE) © 2026 Hedy
