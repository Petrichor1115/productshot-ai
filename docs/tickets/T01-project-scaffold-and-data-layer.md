# T01 · 项目脚手架与数据层初始化

> 状态：✅ Done ｜ 优先级：P0 ｜ 阶段：S1 基础底座
> 执行时间：2026-10-26 16:45 – 16:55（约 10 min）
> 关联文档：`docs/prd/PRD.md` §5 技术架构 · §6 数据库设计 · §8 非功能需求

## 1. 目标

搭起可运行的最小后端骨架：Express 5 服务、`sql.js` 数据层、三张业务表自动建表、静态资源托管、统一响应与错误处理，为后续所有 ticket 提供承载底座。

## 2. 背景与范围

**在范围内**
- 单文件 `server.js` 入口（保持零构建、直接 `node server.js` 可跑）
- SQLite 持久化到 `data.db` 单文件
- 按 `schema.sql` 建 users / sessions / generations 三表 + 索引
- 统一 JSON 响应结构与全局错误中间件
- `uploads/` 目录自动创建与静态挂载

**明确排除（后续 ticket 或悬空）**
- 任何业务路由（认证 / 会话 / 生成 / 管理端）→ T02 起
- 火山引擎调用 → T03
- 用户自定义 Skill、图片二次编辑 → v1.x 悬空

## 3. 前置依赖

无（本 ticket 为链路起点）。

## 4. 任务清单

- [x] 初始化 `package.json`，声明 `type: module`，锁定依赖版本
- [x] 安装依赖：express@5 / bcryptjs / jsonwebtoken / multer / sql.js
- [x] 编写 `schema.sql`（三表 + 6 个索引 + 外键级联）
- [x] `server.js` 启动时加载 `data.db`；文件不存在则按 schema 建表
- [x] 封装 `dbRun / dbGet / dbAll` 三个数据访问helper
- [x] 实现 `persist()`：sql.js 内存库定期回写 `data.db` 文件
- [x] 统一响应封装 `ok() / fail()` 与全局 error 中间件
- [x] 挂载 `public/` 静态目录与 `uploads/` 静态目录
- [x] 启动时自动创建默认管理员 `admin / admin123`

## 5. 关键实现

**数据层选型**：采用 `sql.js`（SQLite 编译为 WASM，零原生依赖），而非 `better-sqlite3`。

```js
// server.js 片段
const SQL = await initSqlJs();
const buf = fs.existsSync(DB_FILE) ? fs.readFileSync(DB_FILE) : null;
db = new SQL.Database(buf);
db.run(fs.readFileSync('schema.sql', 'utf8'));

function persist() {
  fs.writeFileSync(DB_FILE, Buffer.from(db.export()));
}
```

**统一响应**：

```js
res.json({ success: true, data } )        // 成功
res.json({ success: false, error: msg })  // 失败
```

**落盘策略**：每次写操作后调用 `persist()`；进程 `SIGINT` 时再兜底持久化一次，避免 WASM 内存库丢失改动。

## 6. 涉及文件

| 文件 | 操作 |
|------|------|
| `package.json` | 新建 |
| `schema.sql` | 新建 |
| `server.js` | 新建（骨架） |
| `.env` | 新建（JWT_SECRET / PORT / ARK_API_KEY 占位） |
| `data.db` | 运行时生成 |
| `uploads/` | 运行时生成 |

## 7. 验收标准（AC）

1. `npm start` 能在 3 秒内启动，控制台打印监听端口与建表结果。
2. 首次启动自动生成 `data.db`，且三张表与全部索引存在。
3. 进程重启后数据不丢失（注册一个用户 → 重启 → 仍能查到）。
4. 访问 `http://localhost:3000/` 返回静态页，不报 404。
5. 任一路段抛异常时，返回结构统一为 `{ success:false, error }`，HTTP 500，且服务不崩溃。

## 8. 自测记录

| 项 | 命令 / 操作 | 结果 |
|----|-------------|------|
| 冷启动建表 | `rm data.db && node server.js` | ✅ 三表建齐 |
| 索引校验 | `SELECT name FROM sqlite_master WHERE type='index'` | ✅ 6 个索引 |
| 持久化 | 写入用户 → 重启 → 查询 | ✅ 数据仍在 |
| 异常兜底 | 临时 throw 一个 Error | ✅ 返回统一结构，进程存活 |

## 9. 风险与决策

| 决策 | 原因 |
|------|------|
| 选 `sql.js` 而非 `better-sqlite3` | 纯 WASM、零编译依赖，避免现场装 node-gyp / Python 工具链失败 |
| 代价 | 需手动 `persist()` 回写文件，忘记调用会丢数据 → 已在所有写路径强制调用 |
| 单文件 `server.js` | 作业时限内优先可运行性与可交付性，不引入构建工具 |
| 管理员内置种子 | 管理端需可登录，密码哈希无法用纯 SQL 生成，故在启动逻辑写入 |

## 10. 遗留 / 后续

- `persist()` 为全量写盘，数据量大后需改为增量或定时；v1.0 规模下无影响 → 记录为技术债。
- 未接入日志中间件，排障靠 console → 若时间允许在 v1.1 补 `logger`。
