# T21 · 长任务异步化与任务中心

> 状态：⬜ Todo ｜ 优先级：P0 ｜ 阶段：v1.2 架构
> 依赖：T11、T06、T08 ｜ 来源：T11 遗留项（长任务异步化 + 任务中心）
> 规格状态：v1.2 规划，PRD v2.1 未覆盖；需 PRD 增补"任务中心"页面定义

## 1. 目标

把生图从"请求期间必须保持连接"改为"提交即返回、后台执行、随时可查"，并落地用户端任务中心，让用户离开页面或断网后仍能取回结果。

## 2. 背景与范围

**问题**：T11 把串行改为并行 + SSE 流式返回，本质是同步链路的优化，仍未解决两个问题：一是浏览器刷新或断网会中断 SSE，已消耗额度的任务结果丢失；二是三类全选即便并行仍需数十秒，用户被迫停留在页面等待。

**在范围内**
- `jobs` 任务表：状态流转 `queued → running → success / failed / cancelled`
- `POST /api/jobs` 立即返回 `jobId`，后台 worker 执行
- `GET /api/jobs/:id` 查询进度与结果；`GET /api/jobs` 任务列表
- 用户端任务中心入口，展示进行中 / 已完成 / 失败三类
- 取消任务（仅对尚未发起模型调用的任务可靠生效）
- 进程重启时的任务恢复策略

**明确排除**
- 分布式队列（Redis / BullMQ）、多 worker 实例 → 单机场景下无必要
- 任务优先级调度、公平配额 → v1.3
- 任务重试按钮 → 复用 T15 的单张重生成入口

## 3. 前置依赖

- T06（生成服务与失败隔离）、T11（并行改造）、T08（结果区渲染）

## 4. 任务清单

- [ ] 建 `jobs` 表：id / user_id / session_id / gen_type / payload JSON / status / progress / result JSON / error_msg / 时间戳
- [ ] 建 `job_items` 子表：每个 job 下按 `shot_type` 拆分的子任务与各自状态
- [ ] `POST /api/jobs`：校验额度（联动 T19）后立即入库并返回 jobId，不阻塞
- [ ] 进程内 worker：串行消费队列，单 job 内部并行（复用 T11 的 `allSettled`）
- [ ] `GET /api/jobs/:id`：返回子任务级进度，前端按 `shot_type` 渲染
- [ ] 任务中心页：三态分组、刷新、跳转回会话查看结果
- [ ] 取消任务：仅 `queued` 态可靠取消；`running` 态提示"已发起，无法取消"
- [ ] 启动时恢复：把残留 `running` 的任务标记为 `failed` 并写入说明（避免永远转圈）
- [ ] 前端记住 jobId（localStorage），刷新后自动续查

## 5. 关键实现

```js
// 提交即返回：不做 await 生成
app.post('/api/jobs', requireAuth, (req, res) => {
  const jobId = insertJob({ userId: req.user.id, payload, status: 'queued' });
  queue.push(jobId);            // 入队，不阻塞响应
  drainQueue();                 // 触发消费
  res.json({ success: true, data: { jobId } });
});

// 启动恢复：残留 running 一律置 failed，防止永远转圈
db.run("UPDATE jobs SET status='failed', error_msg='进程重启，任务中断' WHERE status='running'");
```

**进度粒度**：进度以 `job_items` 的完成数为准（如 2/3），而非整体布尔值，这样任务中心能给出可信的百分比。

## 6. 涉及文件

| 文件 | 操作 |
|------|------|
| `schema.sql` | 新增 jobs / job_items 表 |
| `server.js` | 任务接口 + worker |
| `public/workspace.html` | 任务中心入口 |
| `public/js/workspace.js` | 任务轮询与结果跳转 |

## 7. 验收标准（AC）

1. 提交生成后 500ms 内返回 jobId，页面可自由跳转不受影响。
2. 刷新页面后任务中心仍能查到该任务并在完成后看到结果。
3. 进度展示以子任务数为准，不出现"3/3 后仍在转圈"。
4. `queued` 态任务可取消且不为失败扣费（联动 T19）。
5. 进程重启后所有残留 `running` 任务变为 `failed` 且有说明文案。
6. 并发提交 5 个 job 时按队列逐个执行，不触发方舟限流。
7. 任务中心失败任务展示 `error_msg`，可一键回到会话重试。

## 8. 验证计划（待执行）

| 项 | 状态 |
|----|------|
| 提交即返回 | ⬜ |
| 刷新后续查 | ⬜ |
| 进度准确性 | ⬜ |
| 取消与不扣费 | ⬜ |
| 重启恢复 | ⬜ |
| 并发排队 | ⬜ |

## 9. 风险与决策

| 风险 | 应对 |
|------|------|
| 进程重启丢任务 | 启动恢复策略：残留 running 一律置 failed，宁可让用户重试也不假装在运行 |
| 单机队列无法水平扩展 | v1.2 单机规模足够；接入 Redis 队列的改造点已隔离在 `queue` 模块内 |
| 轮询产生大量请求 | 任务中心按 3s 轮询且仅在有非终态任务时启动；有 T11 的 SSE 可复用时优先 SSE |
| 取消与额度竞争 | 取消时若已扣费需回滚流水，必须与 T19 的扣减在同一事务里处理 |

## 10. 遗留 / 后续

- 分布式队列与多实例 worker → v1.3，接口层已隔离。
- 任务优先级、按用户公平调度 → v1.3。
- 完成后的站内通知联动 → T27。
