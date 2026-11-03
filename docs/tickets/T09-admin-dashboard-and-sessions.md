# T09 · 管理端框架、数据看板与会话记录

> 状态：✅ Done ｜ 优先级：P1 ｜ 阶段：S5 管理端
> 执行时间：2026-10-26 18:42 – 18:56（约 14 min）
> 依赖：T02、T04 ｜ 关联文档：`pages/管理端-仪表盘.md` §3–§6 · §10 权限控制

## 1. 目标

交付管理端主控台框架：左侧固定导航 + 右侧内容区的 hash 路由骨架，落地数据看板四项统计与会话记录列表，并落实管理员权限守卫。

## 2. 背景与范围

**在范围内**
- `admin.html` 登录 → `admin-dashboard.html` 主控台
- 侧边导航四菜单（数据看板 / 会话记录 / 生图记录 / 用户反馈）+ 选中竖条
- hash 路由无刷新切换，支持前进/后退与直达链接
- `GET /api/admin/stats`、`GET /api/admin/sessions`
- 权限守卫：无 token 跳登录；role≠admin 提示无权限

**明确排除**
- 生图记录视图 → T10
- 用户反馈真实功能 → 预留占位空状态
- 管理员开账号 / 禁用用户 → 悬空（作业要求提及，v1.1 补）

## 3. 前置依赖

- T02（管理员角色）、T04（会话数据）

## 4. 任务清单

- [x] 顶部栏 64px（后台标识 / 当前视图标题 / 管理员 / 登出）
- [x] 侧边导航 200px 固定，四菜单按固定顺序，hover 高亮 + 选中左侧 3px 竖条
- [x] hash 路由：`#/dashboard` `#/sessions` `#/records` `#/feedback`，未知 hash 重定向 dashboard
- [x] 数据看板：4 张统计卡（总用户数 / 总会话数 / 总生成图片数 / 今日生成图片数）
- [x] 会话记录表格：用户名 / 会话名 / 创建时间 / 图片数 / 最近生成时间，每页 20 条 + 分页
- [x] `requireAdmin` 中间件，所有 `/api/admin/*` 403 防护
- [x] 前端视图守卫：切换视图前校验 token
- [x] 异常态：统计失败显示"—"，列表失败显示重试

## 5. 关键实现

```js
// hash 路由：监听 hashchange，按需加载数据
window.addEventListener('hashchange', () => render(location.hash));
const VIEWS = {
  '#/dashboard': loadStats,
  '#/sessions' : loadSessions,
  '#/records'  : loadRecords,
  '#/feedback' : renderPlaceholder
};
```

```sql
-- 会话记录：JOIN users + 聚合 generations
SELECT u.username, s.name AS session_name, s.created_at,
       COUNT(g.id) AS image_count, MAX(g.created_at) AS last_generated_at
FROM sessions s
JOIN users u ON u.id = s.user_id
LEFT JOIN generations g ON g.session_id = s.id
GROUP BY s.id ORDER BY s.created_at DESC LIMIT 20 OFFSET ?;
```

## 6. 涉及文件

| 文件 | 操作 |
|------|------|
| `public/admin.html` | 复用（T02） |
| `public/admin-dashboard.html` | 新建 |
| `public/js/admin.js` | 新建 |
| `server.js` | 新增 `/api/admin/stats`、`/api/admin/sessions` |

## 7. 验收标准（AC）

1. 非管理员账号登录后访问主控台被拦截并提示"无权限"。
2. 直接访问 `admin-dashboard.html#/sessions` 鉴权通过后直达会话记录视图。
3. 浏览器前进/后退能正确恢复视图与选中态。
4. 四项统计数值与数据库实际一致。
5. 会话记录分页切换正确，无数据时显示"暂无数据"。
6. 后端未带 admin token 请求 `/api/admin/*` 返回 403。

## 8. 自测记录

| 场景 | 结果 |
|------|------|
| 非管理员访问 | ✅ 提示并跳转 |
| hash 直达与前进后退 | ✅ 视图与选中态一致 |
| 统计数值比对 | ✅ 与 SQL 直查一致 |
| 分页翻页 | ✅ 第 2 页数据正确 |
| 403 防护 | ✅ 未带 admin token 被拒 |

## 9. 风险与决策

| 决策 | 原因 |
|------|------|
| hash 路由而非 History API | 无后端 rewrite 配置，刷新与直链都不会 404 |
| 统计用 SQL 聚合而非内存计算 | 数据量增长后仍稳定 |
| 用户反馈先占位 | 遵循 PRD 范围，避免无源数据编造功能 |

## 10. 遗留 / 后续

- 管理员开账号 / 用户禁用（作业要求）未实现 → v1.1 最高优先级。
- 无时间范围筛选与导出。
