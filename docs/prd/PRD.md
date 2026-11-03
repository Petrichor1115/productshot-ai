# PRD — AI 商品套图生成器（ProductShot AI）

> 版本：v2.1（管理端侧边导航版）  
> 日期：2026-10-26  
> 作者：胡晓惠  
> 端形态：**仅 Web 网页端**（不包含 APP、小程序、桌面客户端）  
> 变更摘要：管理端重构为「左侧固定导航栏 + 四菜单视图」（数据看板 / 会话记录 / 生图记录 / 用户反馈）；生图记录列表扩展「生图类型」字段、状态改为三态展示；用户端保持 v2.0 设计不变

---

## 1. 产品概述

### 1.1 产品名称
**AI 商品套图生成器**（ProductShot AI）

### 1.2 产品定位
面向电商卖家的 **Web 端 AI 工具**，在浏览器中上传一张物品照片，自动生成标准化电商商品套图（主图、场景展示、卖点详解），可直接用于电商平台上架。

### 1.3 目标用户
- 中小电商卖家（淘宝/拼多多/抖音电商）
- 微商/个人创业者
- 缺乏设计能力、需快速出商品图的用户

### 1.4 核心价值
| 价值 | 说明 |
|------|------|
| 降本 | 无需摄影师/设计师，AI 自动生成 |
| 提效 | 一张图输入，1 分钟内输出全套商品图 |
| 标准化 | 符合电商规范（白底主图、场景图、卖点图） |

### 1.5 端形态
**仅 Web 网页端**，支持 Chrome / Edge / Firefox 最新版。

---

## 2. 功能模块总览

```
ProductShot AI
├── 用户端（Web）
│   ├── 认证模块（v1.2 原设计不变）
│   │   ├── 注册
│   │   ├── 登录
│   │   └── 登出
│   ├── 对话式首页（v2.0 新增，替代旧工作台入口）
│   │   ├── 用户信息展示区
│   │   ├── 五大功能入口（生成套图 / AI 生图 / 爆款复刻 / 商品换色 / 风格裂变）
│   │   ├── 自然语言 + 图片组合输入
│   │   ├── Agent 模式开关
│   │   ├── 5 个功能快捷键按钮（底部 pill Tab 栏）
│   │   ├── 新增会话按钮
│   │   └── 历史会话记录列表
│   ├── 套图生成子页面（v2.0 新增，三列式布局）
│   │   ├── 左侧栏（复用首页侧边栏，宽度收缩 50%）
│   │   ├── 中间组图参数配置区
│   │   │   ├── 主图上传模块（最多 9 张，支持多图同商品）
│   │   │   ├── 补充信息输入模块
│   │   │   ├── 组图内容设置模块（产品主图 / 使用场景 / 卖点介绍，可开关）
│   │   │   ├── 自选风格选择模块（简约白底 / 高级布光 / 自然场景 / 暗调质感）
│   │   │   └── 立即生成按钮
│   │   └── 右侧生成结果展示区
│   │       ├── 大图预览区（顶部）
│   │       ├── 全部下载操作区（中部）
│   │       └── 生成结果缩略图列表（底部）
│   └── 其他 4 个功能入口（AI 生图 / 爆款复刻 / 商品换色 / 风格裂变）
│       └── v2.0 暂不开通，保留 UI 按钮，点击提示"即将上线"
│
└── 管理端（Web，v2.1 重构：侧边导航 + 四菜单视图）
    ├── 管理员认证模块
    │   ├── 登录
    │   └── 登出
    ├── 左侧固定导航栏（v2.1 新增）
    │   ├── 一级菜单：数据看板 / 会话记录 / 生图记录 / 用户反馈（固定顺序）
    │   ├── 每个菜单项：图标 + 文字 + hover 高亮 + 选中态左侧竖条
    │   └── 无刷新视图切换（URL hash 路由）
    ├── 数据看板（默认视图）
    │   └── 总用户数 / 总会话数 / 总生成图片数 / 今日生成图片数
    ├── 会话记录
    │   └── 会话列表（用户名 / 会话名 / 创建时间 / 图片数 / 最近生成时间）+ 分页
    ├── 生图记录（v2.1 字段扩展）
    │   └── 用户名 / 会话名 / 生成时间（分钟级）/ 生图类型（生成套图）/ 套图类型 / 状态（成功·进行中·失败）/ 缩略图 + 分页
    └── 用户反馈（v2.1 预留，占位空状态）
```

---

## 3. 子页面清单

| 端 | 页面 | 文件 | PRD 文档 | 状态 |
|----|------|------|----------|------|
| 用户端 | 登录页 | `public/index.html` | [用户端-登录页.md](./pages/用户端-登录页.md) | 🟢 v1.2 不变 |
| 用户端 | **对话式首页** | `public/workspace.html` | [用户端-工作台.md](./pages/用户端-工作台.md) | 🟡 **v2.0 重构** |
| 用户端 | **套图生成子页面** | 对话式首页内嵌视图（SPA） | [用户端-工作台.md](./pages/用户端-工作台.md) | 🆕 v2.0 新增 |
| 管理端 | 登录页 | `public/admin.html` | [管理端-登录页.md](./pages/管理端-登录页.md) | 🟢 v1.2 不变 |
| 管理端 | **主控台**（侧边导航 + 数据看板/会话记录/生图记录/用户反馈） | `public/admin-dashboard.html` | [管理端-仪表盘.md](./pages/管理端-仪表盘.md) | 🟡 **v2.1 重构** |

> **说明**：套图生成子页面不新增独立 HTML 文件，由 `workspace.html` 内部通过视图切换实现（SPA 单页多态）。

---

## 4. 核心交互流程

### 4.1 用户端主流程（v2.0 更新）
```
访问 index.html → 登录/注册 → 跳转 workspace.html（对话式首页）
  → 在首页输入卡上传图片 + 输入自然语言描述
  → 点击底部「生成套图」pill 按钮
    ├─ 直接输入卡 → 自动创建会话 → 套图生成子页面视图
    └─ 或侧边栏「生成套图」技能入口 → 进入套图生成子页面视图

→ 套图生成子页面（三列式）
  → 左列：复用首页侧边栏
  → 中列：主图上传 / 补充信息 / 组图内容开关 / 自选风格
  → 点击「立即生成」
  → 右列顶部大图预览 → 全部下载 → 底部 3 张缩略图
```

### 4.2 四大暂不开通功能
| 功能 | 入口位置 | v2.0 行为 |
|------|----------|-----------|
| AI 生图 | 侧边栏技能按钮 + 底部 Tab | 点击 toast「该功能即将上线 ✨」 |
| 爆款复刻 | 侧边栏技能按钮 + 底部 Tab | 点击 toast「该功能即将上线 ✨」 |
| 商品换色 | 侧边栏技能按钮 + 底部 Tab | 点击 toast「该功能即将上线 ✨」 |
| 风格裂变 | 侧边栏技能按钮 + 底部 Tab | 点击 toast「该功能即将上线 ✨」 |

### 4.3 管理端主流程（v2.1 更新）
```
访问 admin.html → 管理员登录 → 跳转 admin-dashboard.html
  → 默认进入「数据看板」视图（#/dashboard）→ 查看 4 项统计指标
  → 点击左侧导航栏切换视图（无刷新，URL hash 路由）：
    - 会话记录（#/sessions）→ 全平台会话列表 + 分页
    - 生图记录（#/records） → 全平台生成记录明细（7 字段）+ 分页 + 缩略图预览
    - 用户反馈（#/feedback）→ 预留占位页
```

---

## 5. 技术架构

### 5.1 整体架构
```
浏览器 (Web)
  ├── 用户端 SPA (index.html + workspace.html，单页多态)
  └── 管理端 SPA (admin.html + admin-dashboard.html，v1.2 不变)
       │
       ▼ REST API (JSON)
后端 (Node.js + Express，v1.2 不变)
  ├── 认证模块 (JWT)
  ├── 会话管理模块
  ├── 套图生成模块
  ├── 管理统计模块
  ├── SQLite (data.db)
  └── Skill 模板 (skills/product-shot-template.json)
       │
       ▼ HTTP API
火山引擎方舟
  ├── 豆包 C 2.1 Lite (图像理解/卖点提取)
  └── Seedream 5.0 Pro (图生图/文生图)
```

### 5.2 套图生成详细流程（v2.0 更新：支持多图输入 + 风格预设 4 种）
```
1. 用户上传原图（支持 ≤ 9 张同商品多角度照片）→ 后端保存 uploads/，返回路径数组
2. 用户输入补充信息（品牌、尺寸参数、核心卖点、使用场景等）
3. 勾选组图内容开关（产品主图 / 使用场景 / 卖点介绍，默认全选）
4. 选择自选风格（简约白底 / 高级布光 / 自然场景 / 暗调质感，默认简约白底）
5. POST /api/generate(sessionId, imagePaths[], supplement, shot_types[], style)
6. 豆包 C 2.1 分析主图 → { name, category, sellingPoints[3] }
7. 加载 Skill 模板，填充变量（补充信息、风格、组图类型），生成对应数量提示词
8. 依次调用 Seedream 5.0 Pro：
   - 产品主图：image=原图, prompt="白底商品主图...{风格}...{补充信息}"
   - 使用场景：image=原图, prompt="真实使用场景...{风格}...{补充信息}"
   - 卖点介绍：prompt="商品展示图+卖点文字标注...{风格}...{补充信息}"
9. 保存记录到 SQLite
10. 返回生成图 URL 数组
```

### 5.3 风格预设（v2.0 扩展为 4 种）
| 风格 | 值 | 关键词 | 说明 |
|------|-----|--------|------|
| 简约白底 | minimal | minimal, clean, pure white background, soft shadow | 干净简洁，白底突出商品 |
| 高级布光 | premium | premium, studio lighting, rim light, dramatic shadows | 高端商业质感，专业布光 |
| 自然场景 | natural | lifestyle, natural environment, warm sunlight, organic | 真实生活场景，温暖自然光 |
| 暗调质感 | dark | dark background, moody lighting, product focus | 暗色系，突出商品主体 |

---

## 6. 数据库设计（SQLite）

> v1.2 表结构不变，`sessions.original_image` 扩展为支持多图时可新增 `original_images` TEXT（JSON 数组）字段。

### 6.1 users 表（v1.2 不变）
| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK AUTOINCREMENT | 用户 ID |
| username | TEXT | UNIQUE NOT NULL | 用户名 |
| password | TEXT | TEXT NOT NULL | bcrypt 哈希 |
| role | TEXT | NOT NULL DEFAULT 'user' | user / admin |
| created_at | TEXT | NOT NULL | 创建时间 |

### 6.2 sessions 表
| 字段 | 类型 | 约束 | 说明 | 变更 |
|------|------|------|------|------|
| id | INTEGER | PK AUTOINCREMENT | 会话 ID | — |
| user_id | INTEGER | NOT NULL FK | 所属用户 | — |
| name | TEXT | NOT NULL | 会话名称 | — |
| original_image | TEXT | | 原图路径（单图） | — |
| **original_images** | TEXT | | **原图路径数组 JSON（多图时使用）** | 🆕 v2.0 |
| **supplement** | TEXT | | **补充信息输入内容** | 🆕 v2.0 |
| **shot_types** | TEXT | | **组图类型开关 JSON**（如 `["main","scene","selling"]`） | 🆕 v2.0 |
| **style** | TEXT | | **自选风格值** | 🆕 v2.0 |
| created_at | TEXT | NOT NULL | 创建时间 | — |

### 6.3 generations 表
| 字段 | 类型 | 约束 | 说明 | 变更 |
|------|------|------|------|------|
| id | INTEGER | PK AUTOINCREMENT | 记录 ID | — |
| session_id | INTEGER | NOT NULL FK | 所属会话 | — |
| **gen_type** | TEXT | NOT NULL DEFAULT 'product_set' | **生图类型：`product_set`（生成套图），为 AI 生图等类型预留扩展** | 🆕 v2.1 |
| shot_type | TEXT | NOT NULL | main / scene / selling | — |
| saved_path | TEXT | | 图片保存路径 | — |
| prompt | TEXT | | 提示词 | — |
| status | TEXT | NOT NULL | pending / generating / success / failed（前端展示映射：成功 / 进行中 / 失败） | — |
| error_msg | TEXT | | 失败原因 | — |
| created_at | TEXT | NOT NULL | 创建时间（管理端展示精确到分钟） | — |

---

## 7. API 接口

> v1.2 所有接口保持不变；`POST /api/generate` 请求体新增 `image_paths` / `supplement` / `shot_types` / `style` 字段，原字段 `imagePath` / `imageSize` 兼容保留。

| 模块 | 方法 | 路径 | 说明 | 变更 |
|------|------|------|------|------|
| 认证 | POST | /api/auth/register | 注册 | — |
| 认证 | POST | /api/auth/login | 登录 | — |
| 会话 | GET | /api/sessions | 会话列表（当前用户） | — |
| 会话 | POST | /api/sessions | 新建会话 | — |
| 会话 | GET | /api/sessions/:id | 会话详情（含 original_images / supplement / shot_types / style） | 🆕 v2.0 返回扩展 |
| 会话 | DELETE | /api/sessions/:id | 删除会话 | — |
| 上传 | POST | /api/upload | 上传图片（返回 path） | — |
| 生成 | POST | /api/generate | 生成套图 | 🆕 v2.0 多图支持 |
| 管理 | GET | /api/admin/stats | 统计数据（数据看板） | — |
| 管理 | GET | /api/admin/sessions | 会话记录列表（JOIN users，含图片数/最近生成时间，分页） | 🆕 v2.1 |
| 管理 | GET | /api/admin/records | 生图记录列表（JOIN users/sessions，响应含 username/session_name/gen_type，时间精确到分钟） | 🟡 v2.1 响应扩展 |

---

## 8. 非功能需求

| 项 | 要求 |
|----|------|
| 端形态 | 仅 Web 网页端 |
| 前端 | 原生 HTML/CSS/JS，无构建工具 |
| 后端 | Node.js + Express |
| 数据库 | SQLite（单文件） |
| AI | 火山引擎方舟 |
| 响应式 | 桌面优先（≥1280px），兼容平板（≥768px） |
| 性能 | 单张图 ≤ 30s，3 张总计 ≤ 90s |
| 安全 | bcrypt 密码、JWT 鉴权、API Key 后端隐藏 |
| 设计规范 | 主色 `#5B7BEE`（企业蓝）、背景 `#F4F6FB`（浅蓝灰）、字体 PingFang SC / Microsoft YaHei |

---

## 9. 项目目录结构

```
loop-demo/
├── server.js
├── package.json
├── data.db
├── .env
├── uploads/
├── skills/
│   └── product-shot-template.json
├── model/
│   ├── volc-client.mjs
│   └── .env
├── public/
│   ├── index.html              ← 登录页（v1.2 不变）
│   ├── workspace.html          ← 对话式首页 + 套图生成子页面（SPA 单页多态）
│   ├── admin.html              ← 管理端登录（v1.2 不变）
│   ├── admin-dashboard.html    ← 管理端主控台（v2.1 侧边导航 + 四视图 SPA）
│   ├── css/style.css
│   └── js/
│       ├── auth.js
│       ├── workspace.js        ← v2.0 重写（两视图切换）
│       └── admin.js
└── docs/prd/
    ├── PRD.md                  ← v2.1 更新
    └── pages/
        ├── 用户端-登录页.md    ← v1.2 不变
        ├── 用户端-工作台.md    ← v2.0 重写（首页 + 套图子页面）
        ├── 管理端-登录页.md    ← v1.2 不变
        └── 管理端-仪表盘.md    ← v2.1 重写（侧边导航 + 四菜单视图）
```

---

## 10. 范围说明

### v2.1 新增（管理端）
- ✅ 左侧固定导航栏（数据看板 / 会话记录 / 生图记录 / 用户反馈，图标 + hover 高亮 + 选中竖条）
- ✅ 数据看板（4 项统计卡片，默认视图）
- ✅ 会话记录列表（用户名 / 会话名 / 创建时间 / 图片数 / 最近生成时间 + 分页）
- ✅ 生图记录列表（7 字段：用户名 / 会话名 / 生成时间分钟级 / 生图类型「生成套图」/ 套图类型 / 状态三态 / 缩略图 + 分页 + 大图预览）
- ✅ generations 表新增 `gen_type` 字段（默认 `product_set`）
- ✅ 用户反馈（预留菜单，占位空状态）

### v2.0 实现（用户端）
- ✅ 对话式首页（左侧栏 + 大输入卡 + Agent 开关 + 5 个 pill Tab）
- ✅ 套图生成子页面（三列式：窄侧栏 / 参数配置 / 大图预览 + 缩略图）
- ✅ 主图多图上传（最多 9 张同一商品多角度）
- ✅ 补充信息输入（品牌 / 尺寸参数 / 核心卖点 / 使用场景）
- ✅ 组图内容开关（产品主图 / 使用场景 / 卖点介绍，可自由组合）
- ✅ 自选风格 4 种（简约白底 / 高级布光 / 自然场景 / 暗调质感）
- ✅ 大图预览 + 全部下载 + 单张下载 + 预览切换
- ✅ 新建会话 / 切换会话 / 删除会话 / 历史回填

### v2.0 暂不开通（UI 保留，点击提示"即将上线"）
- ❌ AI 生图（独立入口）
- ❌ 爆款复刻（独立入口）
- ❌ 商品换色（独立入口）
- ❌ 风格裂变（独立入口）

### v1.2 悬空（延续）
- ❌ 用户自定义 Skill
- ❌ 图片编辑/二次修改
- ❌ APP / 小程序端

---

## 11. 交付物

| # | 交付物 | 内容 |
|---|--------|------|
| 1 | 产品架构设计图 | 前后端 + 数据库 + 火山引擎 + Skill 架构 |
| 2 | 用户端截图 | 登录页、**对话式首页**、**套图生成子页面**（三列式）、套图结果预览 |
| 3 | 管理端截图 | 侧边导航栏、数据看板、会话记录、生图记录列表（7 字段） |
| 4 | 数据库结构截图 | SQLite 3 张表结构（含 v2.0 / v2.1 扩展字段） |
