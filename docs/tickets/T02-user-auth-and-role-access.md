# T02 · 用户认证与角色鉴权

> 状态：✅ Done ｜ 优先级：P0 ｜ 阶段：S1 基础底座
> 执行时间：2026-10-26 16:55 – 17:08（约 13 min）
> 依赖：T01 ｜ 关联文档：`docs/prd/PRD.md` §7 API 接口 · `pages/用户端-登录页.md` · `pages/管理端-登录页.md`

## 1. 目标

实现注册 / 登录 / 登出与 JWT 鉴权，建立 `user` / `admin` 双角色体系，并打通两个登录页前端，使后续所有业务接口都能拿到可信身份。

## 2. 背景与范围

**在范围内**
- `POST /api/auth/register`、`POST /api/auth/login`
- bcrypt 密码哈希；JWT 签发与校验中间件
- `requireAuth`（登录即可）与 `requireAdmin`（role=admin）两级守卫
- 前端 `public/index.html`（用户端登录/注册）与 `public/admin.html`（管理端登录）
- 前端 token 落 localStorage，非 admin 禁止进入管理端

**明确排除**
- 第三方登录、手机号、邮箱验证 → 悬空
- 找回密码 / 修改密码 → 悬空
- 用户管理（管理员开账号）→ 作业要求提及，v1.0 用内置 admin 替代，记为 T09 遗留项

## 3. 前置依赖

- T01（数据层 + users 表 + 统一响应）

## 4. 任务清单

- [x] `register`：用户名 3–20 字符、密码 ≥ 6 位校验，用户名唯一冲突返回明确错误
- [x] `login`：bcrypt.compare 校验，失败统一提示"用户名或密码错误"（不区分存在性，防枚举）
- [x] JWT 签发：payload 含 `{ id, username, role }`，有效期 7 天
- [x] `authMiddleware`：解析 `Authorization: Bearer <token>`，失效返回 401
- [x] `adminMiddleware`：在 auth 之后校验 `role === 'admin'`，否则 403
- [x] 用户端登录页：登录 / 注册双模式切换，错误红字提示，成功后跳 `workspace.html`
- [x] 管理端登录页：`🛡️ 管理后台` 标识，登录后校验 role，非管理员提示"无管理员权限"
- [x] 前端统一 `api.js`：自动携带 token，遇 401 清 token 并跳登录页

## 5. 关键实现

```js
// 登录签发
const token = jwt.sign(
  { id: user.id, username: user.username, role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);

// 两级守卫
const requireAuth  = (req, res, next) => { /* 解析 Bearer → req.user */ };
const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ success:false, error:'无权限' });
  next();
};
```

**安全决策**：登录失败不区分"用户不存在"与"密码错误"，统一文案，避免账号枚举。

## 6. 涉及文件

| 文件 | 操作 |
|------|------|
| `server.js` | 新增 `/api/auth/*` 路由 |
| `public/index.html` | 新建 |
| `public/admin.html` | 新建 |
| `public/js/auth.js` | 新建 |
| `public/js/api.js` | 新建（token 注入 + 401 处理） |
| `.env` | 新增 `JWT_SECRET` |

## 7. 验收标准（AC）

1. 注册成功后立即返回 token 并跳转工作台，无需二次登录。
2. 重复用户名注册返回明确错误"用户名已存在"，不产生脏数据。
3. 密码在库中为 bcrypt 哈希，绝无明文。
4. 不带 token 访问受保护接口 → 401；带 user 角色 token 访问 `/api/admin/*` → 403。
5. 管理员账号登录后前端校验 role，非 admin 被拦在 `admin.html`。
6. token 过期或被篡改 → 401，前端清除并跳回登录页。

## 8. 自测记录

| 场景 | 输入 | 结果 |
|------|------|------|
| 正常注册 | user1 / 123456 | ✅ 返回 token |
| 重名注册 | user1 再次注册 | ✅ "用户名已存在" |
| 弱密码 | 123 | ✅ "密码至少 6 位" |
| 错误密码 | user1 / wrong | ✅ "用户名或密码错误" |
| 越权 | user token 调 `/api/admin/stats` | ✅ 403 |
| 伪造 token | 篡改签名 | ✅ 401 |

## 9. 风险与决策

| 决策 | 原因 |
|------|------|
| JWT 存 localStorage 而非 Cookie | 前后端同域、无 SSR，localStorage 最简；已认知 XSS 风险，v1.0 无富文本渲染场景 |
| 有效期 7 天 | 演示与本地开发场景，避免频繁重新登录 |
| 不做刷新 token | 控制范围，7 天内够用 |

## 10. 遗留 / 后续

- 管理员开账号功能（作业要求）未在 v1.0 实现，当前仅内置 `admin` → 建议 v1.1 补 `POST /api/admin/users`。
- 无登录失败次数限制 → 公网部署前必须补。
