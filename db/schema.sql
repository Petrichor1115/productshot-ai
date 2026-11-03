-- =============================================================================
-- ProductShot AI — 数据库建表脚本（SQLite）
-- 版本：v2.1
-- 说明：
--   1. 本脚本为幂等脚本（CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS），
--      可重复执行，用于初始化与升级。
--   2. 所有时间字段统一使用 TEXT 存储，格式 `YYYY-MM-DD HH:mm:ss`（本地时间），
--      保证可读性与 SQLite 字符串比较排序的正确性。
--   3. 外键约束在 db/index.js 中通过 `PRAGMA foreign_keys = ON` 逐连接开启。
-- =============================================================================

PRAGMA foreign_keys = ON;

-- -----------------------------------------------------------------------------
-- 1. users — 用户表（用户端普通用户 + 管理端管理员共用）
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,   -- 用户 ID，自增主键
    username    TEXT    NOT NULL UNIQUE,             -- 用户名，登录唯一标识（3~20 字符）
    password    TEXT    NOT NULL,                    -- 密码，bcrypt 哈希（cost=10），永不存明文
    role        TEXT    NOT NULL DEFAULT 'user'      -- 角色：user=普通用户 / admin=管理员
                CHECK (role IN ('user', 'admin')),
    nickname    TEXT,                                -- 展示昵称，为空时前端回退显示 username
    status      TEXT    NOT NULL DEFAULT 'active'    -- 账号状态：active=正常 / disabled=停用
                CHECK (status IN ('active', 'disabled')),
    created_at  TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),  -- 注册时间
    updated_at  TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))   -- 最后更新时间
);

-- 用户名唯一索引（UNIQUE 约束已隐式创建，此处显式声明用于覆盖索引，加速登录查询）
CREATE UNIQUE INDEX IF NOT EXISTS uk_users_username ON users (username);
-- 角色索引：管理端统计「总用户数」时按 role 过滤
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);
-- 创建时间索引：管理端按注册时间倒序浏览
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users (created_at DESC);

-- -----------------------------------------------------------------------------
-- 2. sessions — 会话表（用户端一次对话 / 一个套图任务容器）
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,  -- 会话 ID
    user_id          INTEGER NOT NULL                    -- 所属用户 ID，外键关联 users.id
                     REFERENCES users (id) ON DELETE CASCADE,
    name             TEXT    NOT NULL,                   -- 会话名称（用户自定义，如「蓝牙耳机测试」）
    original_image   TEXT,                               -- 原图相对路径（单图兼容字段，如 /uploads/xxx.png）
    original_images  TEXT,                               -- 原图路径数组 JSON（v2.0 多图，最多 9 张）
    supplement       TEXT,                               -- 补充信息（品牌/尺寸参数/核心卖点/使用场景），上限 500 字
    shot_types       TEXT,                               -- 组图类型开关 JSON 数组，如 ["main","scene","selling"]
    style            TEXT,                               -- 自选风格：minimal / premium / natural / dark
    created_at       TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),  -- 会话创建时间
    updated_at       TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))   -- 会话最后更新时间
);

-- 用户 + 创建时间倒序：用户端「会话记录列表」主查询（覆盖索引，避免额外排序）
CREATE INDEX IF NOT EXISTS idx_sessions_user_created ON sessions (user_id, created_at DESC);
-- 管理端会话记录列表 JOIN 后按创建时间倒序分页
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions (created_at DESC);
-- 管理端生图记录列表需要按 session_id 反查会话名
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id);

-- -----------------------------------------------------------------------------
-- 3. generations — 生图记录表（每一次 AI 出图的明细流水）
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS generations (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,   -- 记录 ID
    session_id  INTEGER NOT NULL                     -- 所属会话 ID，外键关联 sessions.id
                 REFERENCES sessions (id) ON DELETE CASCADE,
    gen_type    TEXT    NOT NULL DEFAULT 'product_set',  -- 生图类型：product_set=生成套图（预留 ai_image 等扩展）
    shot_type   TEXT    NOT NULL                     -- 套图类型：main=产品主图 / scene=使用场景 / selling=卖点介绍
                CHECK (shot_type IN ('main', 'scene', 'selling')),
    saved_path  TEXT,                                -- 生成图保存相对路径（如 /uploads/gen_xxx.png）
    prompt      TEXT,                                -- 本次生成使用的最终提示词，便于回溯与质检
    status      TEXT    NOT NULL DEFAULT 'pending'   -- 状态：pending=排队 / generating=进行中 / success=成功 / failed=失败
                CHECK (status IN ('pending', 'generating', 'success', 'failed')),
    error_msg   TEXT,                                -- 失败原因（status=failed 时写入）
    duration_ms INTEGER,                             -- 本次生成耗时（毫秒），用于前端展示「用时 Xs」与性能观测
    created_at  TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),  -- 生成时间（管理端展示精确到分钟）
    updated_at  TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
);

-- 会话 + 创建时间：用户端加载某会话历史结果的主查询
CREATE INDEX IF NOT EXISTS idx_generations_session_created ON generations (session_id, created_at ASC);
-- 管理端生图记录列表：全平台按生成时间倒序分页（核心索引）
CREATE INDEX IF NOT EXISTS idx_generations_created_at ON generations (created_at DESC);
-- 状态过滤：管理端「进行中」轮询、失败率统计
CREATE INDEX IF NOT EXISTS idx_generations_status ON generations (status);
-- 生图类型过滤：为后续 AI 生图等类型扩展预留
CREATE INDEX IF NOT EXISTS idx_generations_gen_type ON generations (gen_type);

-- -----------------------------------------------------------------------------
-- 4. schema_migrations — 迁移版本记录（保证结构演进可追溯）
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS schema_migrations (
    version     TEXT PRIMARY KEY,                    -- 版本号，如 '2.1.0'
    description TEXT,                                -- 迁移说明
    applied_at  TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))  -- 应用时间
);

INSERT OR IGNORE INTO schema_migrations (version, description)
VALUES ('2.1.0', '初始化 users / sessions / generations 三表及索引（v2.1 含 gen_type 扩展）');

-- =============================================================================
-- 索引规划说明
-- -----------------------------------------------------------------------------
-- 查询场景                                  命中索引
-- 登录：WHERE username = ?                  uk_users_username
-- 用户端会话列表：user_id + 创建时间倒序      idx_sessions_user_created
-- 会话详情：WHERE id = ?                    PRIMARY KEY
-- 会话历史结果：session_id + 时间正序         idx_generations_session_created
-- 管理端总用户数：COUNT(role='user')         idx_users_role
-- 管理端会话列表：JOIN + 创建时间倒序分页      idx_sessions_created_at
-- 管理端生图记录：JOIN + 创建时间倒序分页      idx_generations_created_at
-- 管理端今日图片数：created_at 日期前缀匹配    idx_generations_created_at
-- 会话图片数 / 最近生成时间：session_id 聚合   idx_generations_session_created
-- =============================================================================
