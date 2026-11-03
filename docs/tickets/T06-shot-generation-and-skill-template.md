# T06 · 套图生成服务与 Skill 模板

> 状态：✅ Done ｜ 优先级：P0 ｜ 阶段：S3 业务能力（MVP 核心）
> 执行时间：2026-10-26 17:45 – 18:05（约 20 min）
> 依赖：T03、T04、T05 ｜ 关联文档：`docs/prd/PRD.md` §5.2 生成流程 · §5.3 风格预设 · §6.3 generations 表

## 1. 目标

实现 MVP 核心能力：上传图 + 补充信息 + 组图开关 + 风格 → 经图像理解、Skill 模板渲染提示词、Seedream 串行出图，产出 3 张商品套图并落库，且单张失败不影响其余。

## 2. 背景与范围

**在范围内**
- `POST /api/generate`（入参：sessionId / imagePaths[] / supplement / shotTypes[] / style）
- `skills/product-shot-template.json`：三类图的提示词模板 + 四风格关键词
- 豆包图像理解 → 提取 `{ name, category, sellingPoints[3] }`
- 按勾选类型串行生成，状态流转 `pending → generating → success/failed`
- `gen_type` 固定写 `product_set`，为后续 AI 生图等预留扩展

**明确排除**
- AI 生图 / 爆款复刻 / 商品换色 / 风格裂变四个功能 → v2.0 悬空，仅留 UI
- 用户自定义 Skill → 悬空
- 图片二次编辑 → 悬空

## 3. 前置依赖

- T03（模型客户端）、T04（会话与扩展字段）、T05（上传路径）

## 4. 任务清单

- [x] 设计 `skills/product-shot-template.json`：main / scene / selling_point 三套模板
- [x] 模板变量：`{name} {category} {sellingPoints} {supplement} {styleKeywords}`
- [x] 四风格关键词表落地：minimal / premium / natural / dark
- [x] 图像理解调用与 JSON 容错解析，失败降级为商品名占位
- [x] 按 shotTypes 串行出图，逐张写 generations 记录与状态
- [x] 单张失败写 `failed + error_msg`，继续生成剩余类型
- [x] 生成图下载落盘 `uploads/gen-*`，保存 `saved_path` 与 `prompt`
- [x] 返回三类图的路径与状态数组

## 5. 关键实现

```js
// 提示词渲染：模板 + 变量替换
const render = (tpl, vars) =>
  tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');

// 串行生成 + 失败隔离
for (const shotType of shotTypes) {
  const rowId = insertGeneration({ sessionId, shotType, status: 'pending' });
  try {
    updateGeneration(rowId, { status: 'generating' });
    const url = await generateImage(render(tpl[shotType], vars), imagePaths[0]);
    const saved = await downloadTo(url, 'uploads/');
    updateGeneration(rowId, { status: 'success', saved_path: saved, prompt });
  } catch (e) {
    updateGeneration(rowId, { status: 'failed', error_msg: e.message }); // 不中断循环
  }
}
```

**shot_type 取值对齐决策**：`schema.sql` 用 `selling_point`，PRD 表格中简写为 `selling`。**以 schema 为准统一为 `selling_point`**，管理端标签展示仍为"卖点"，避免前后端枚举不一致导致管理端筛选丢数据。

## 6. 涉及文件

| 文件 | 操作 |
|------|------|
| `server.js` | 新增 `/api/generate` |
| `skills/product-shot-template.json` | 新建 |
| `model/volc-client.mjs` | 复用（T03） |

## 7. 验收标准（AC）

1. 三类图全勾选时产出 3 条 generations 记录，`shot_type` 分别为 main / scene / selling_point。
2. 只勾 1 类时只生成 1 张，其余不产生记录。
3. 四种风格都能产出视觉差异明显的图。
4. 人为让第 2 张失败时，第 1、3 张仍为 success，且失败记录含 `error_msg`。
5. 单张 ≤ 30s，3 张累计 ≤ 90s（PRD §8 性能要求）。
6. `gen_type` 全部为 `product_set`。
7. 生成的 `prompt` 落库可回溯。

## 8. 自测记录

| 场景 | 结果 |
|------|------|
| 三类全选 · 简约白底 | ✅ 3 张成功，耗时 41s |
| 仅主图 | ✅ 1 张，无冗余记录 |
| 四种风格对比 | ✅ 差异明显 |
| 注入失败（断网模拟） | ✅ 该张 failed，其余 success |
| 补充信息为空 | ✅ 降级用图像理解结果，不报错 |
| 9 张原图输入 | ✅ 取首图生成，无异常 |

## 9. 风险与决策

| 决策 | 原因 |
|------|------|
| 串行而非并行出图 | 保证顺序与限流可控；代价是总耗时叠加 → v1.1 改并行的首选优化项 |
| 失败隔离而非整体回滚 | 用户已等待成本高，部分可用优于全量失败 |
| 多图输入当前取首图 | Seedream 单次仅接受一张参考图；多图用于提升理解，已在 PRD 说明 |
| 图像理解失败降级 | 避免单点失败阻断整条链路 |

## 10. 遗留 / 后续

- 串行 → 并行出图 + 流式返回（最高优先级优化项，直接改善等待体验）。
- 提示词模板目前硬编码在 JSON，未开放用户自定义 Skill。
- 无生成次数配额与计费。
