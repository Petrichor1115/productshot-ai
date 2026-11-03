# T18 · 用户反馈模块落地

> 状态：⬜ Todo ｜ 优先级：P2 ｜ 阶段：v1.1 运营
> 依赖：T09、T10 ｜ 来源：PRD §8 用户反馈（v2.1 预留占位空状态）
> 规格状态：v1.1 规划；PRD v2.1 仅定义占位，未定义字段与流程

## 1. 目标

把管理端"用户反馈"从占位空状态升级为可用模块：用户端可提交反馈，管理端可查看、标记处理状态并回复，形成反馈闭环。

## 2. 背景与范围

**问题**：v1.0 用户反馈菜单是空态，不发起任何请求，无法收集真实用户声音，也就无法反推提示词与产品迭代。

**在范围内**
- `feedback` 表：用户 / 类型 / 内容 / 关联会话 / 截图 / 状态 / 处理备注
- 用户端入口：反馈按钮 + 提交弹窗（可附带当前会话）
- 管理端列表：筛选（待处理 / 处理中 / 已解决）、查看、改状态、填写处理备注
- 状态流转与时间戳

**明确排除**
- 邮件 / 短信通知 → 无服务
- 反馈点赞与投票排序 → v1.2
- 用户端展示处理进度 → 本期仅管理端可见（决策见 §9）

## 3. 前置依赖

- T09（管理端框架）、T10（生图记录与列表范式）

## 4. 任务清单

- [ ] 建 `feedback` 表 + `user_id` / `status` / `created_at` 索引
- [ ] `POST /api/feedback`：登录用户提交，内容非空校验，长度上限
- [ ] 可选关联 `session_id`，便于定位问题上下文
- [ ] `GET /api/admin/feedback`：分页 + 按状态筛选，JOIN 用户名与会话名
- [ ] `PATCH /api/admin/feedback/:id`：改状态 + 处理备注
- [ ] 用户端反馈入口与提交弹窗
- [ ] 管理端反馈列表视图替换占位空态
- [ ] 空态与加载失败态处理

## 5. 关键实现

```sql
CREATE TABLE IF NOT EXISTS feedback (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL,
  session_id INTEGER,                     -- 可空，便于定位上下文
  type       TEXT    NOT NULL,            -- bug / suggestion / other
  content    TEXT    NOT NULL,
  status     TEXT    NOT NULL DEFAULT 'pending',  -- pending / processing / resolved
  admin_note TEXT,
  created_at TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE SET NULL
);
```

**闭环设计**：反馈关联会话后，管理员可直接跳到该会话的生图记录查看上下文，减少来回沟通。

## 6. 涉及文件

| 文件 | 操作 |
|------|------|
| `schema.sql` | 新增 feedback 表 |
| `server.js` | 新增 `/api/feedback` 与 `/api/admin/feedback*` |
| `public/js/workspace.js` | 反馈入口 |
| `public/admin-dashboard.html` / `js/admin.js` | 反馈视图 |

## 7. 验收标准（AC）

1. 用户提交反馈后数据库有记录，管理端 5 秒内可见。
2. 未登录不能提交，返回 401。
3. 内容为空或超长时前端与后端双重拦截。
4. 管理端可按状态筛选，改状态后列表同步更新。
5. 处理备注可保存并回显。
6. 反馈关联的会话可跳转查看。
7. 非管理员调用管理端反馈接口返回 403。

## 8. 验证计划（待执行）

| 项 | 状态 |
|----|------|
| 提交与落库 | ⬜ |
| 管理端筛选与改状态 | ⬜ |
| 越权防护 | ⬜ |

## 9. 风险与决策

| 决策 | 原因 |
|------|------|
| 处理备注仅管理端可见 | 一期避免引入消息通知复杂度；用户可见进度列为 v1.2 |
| 关联会话可空 | 用户可能不针对具体会话提反馈 |
| 不做图片上传 | 反馈以文字为主，避免重复建设上传能力（可复用 T05 时再补） |

## 10. 遗留 / 后续

- 用户端进度展示与通知 → v1.2。
- 反馈数据用于反推提示词模板优化（需与 T06 模板迭代联动）。
