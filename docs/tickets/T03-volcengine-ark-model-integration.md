# T03 · 火山引擎方舟模型接入

> 状态：✅ Done ｜ 优先级：P0 ｜ 阶段：S2 数据打通
> 执行时间：2026-10-26 17:08 – 17:24（约 16 min）
> 依赖：T01 ｜ 关联文档：`docs/prd/PRD.md` §5.1 整体架构 · `model/打通文档.md`

## 1. 目标

打通火山引擎方舟平台两个模型能力：豆包 C 2.1 Lite（三模态，承担图像理解与卖点提取）与 Seedream 5.0（图生图/文生图），封装为可复用客户端并产出打通文档。

## 2. 背景与范围

**在范围内**
- `model/volc-client.mjs` 统一封装两个模型调用
- 图像理解：输入商品图 → 输出 `{ name, category, sellingPoints[3] }`
- 图生图：输入原图 + 提示词 → 输出图片 URL / 二进制
- 密钥走 `.env`，绝不进前端、不进代码库
- 两个独立测试脚本 + 打通文档

**明确排除**
- Seedream 5.0 Flash 的图片编辑 / 图层拆分 / 透明背景 → 悬空，记为 v1.1 意图路由候选
- 视频生成 → 无接口，不做

## 3. 前置依赖

- T01（环境变量加载）；需要可用的方舟 API Key

## 4. 任务清单

- [x] 阅读方舟模型广场文档，确认豆包 C 2.1 Lite 与 Seedream 5.0 的接入方式与鉴权头
- [x] 配置 `model/.env`（`ARK_API_KEY`），并提供 `.env.example`
- [x] 封装 `volc-client.mjs`：`analyzeImage()` 与 `generateImage()` 两个方法
- [x] 图像理解返回结构化 JSON，做解析容错（模型偶发返回带 json 代码围栏，需剥离后再解析）
- [x] 图生图返回图片后统一下载落盘 `uploads/`，返回相对路径
- [x] 编写 `test-text.mjs` 与 `test-image.mjs` 两个独立验证脚本
- [x] 产出 `model/打通文档.md`：接入步骤 + 关键代码片段 + 密钥调用方式

## 5. 关键实现

```js
// 图像理解（豆包 C 2.1 Lite，三模态）
const resp = await client.chat.completions.create({
  model: 'doubao-seed-1-6-lite',      // 豆包 C 2.1 Lite
  messages: [{ role: 'user', content: [
    { type: 'image_url', image_url: { url: `data:image/png;base64,${b64}` } },
    { type: 'text', text: '识别商品名称、类目，并提炼 3 条核心卖点，仅返回 JSON' }
  ]}]
});

// 图生图（Seedream 5.0）
const img = await client.images.generate({
  model: 'doubao-seedream-5-0',        // 测试期用 light 档，验收切 pro
  prompt, image: base64, size: '2048x2048'
});
```

**图文一致性要点**：卖点图依赖图像理解产出的 `sellingPoints`，因此必须先跑通理解再跑生成，二者串行不可并行。

## 6. 涉及文件

| 文件 | 操作 |
|------|------|
| `model/volc-client.mjs` | 新建 |
| `model/test-text.mjs` | 新建 |
| `model/test-image.mjs` | 新建 |
| `model/.env` / `.env.example` | 新建 |
| `model/打通文档.md` | 新建 |

## 7. 验收标准（AC）

1. `node model/test-text.mjs` 能返回文本结果，含模型名与耗时。
2. `node model/test-image.mjs` 能产出图片文件并落盘 `uploads/`。
3. 图像理解输出可被 `JSON.parse` 解析，含 name / category / sellingPoints 三字段。
4. `.env` 已被 `.gitignore` 忽略，代码中无硬编码密钥。
5. 打通文档能让第三人照做复现接入。

## 8. 自测记录

| 项 | 结果 |
|----|------|
| 文生文连通性 | ✅ 返回正常，平均耗时 2.1s |
| 图像理解 | ✅ 蓝牙耳机被识别，卖点 3 条合理 |
| 图生图 | ✅ 出图 2048×2048，落盘成功 |
| 密钥泄露检查 | ✅ 全仓 grep 无明文 key |
| 异常入参 | ✅ 空图 / 超大图均返回可读错误 |

## 9. 风险与决策

| 决策 | 原因 |
|------|------|
| 开发期用 light 档，验收切 pro | 控制额度消耗与出图等待，模型可一行替换 |
| 图像理解结果做 JSON 容错 | 模型偶发输出代码围栏包裹，直接 parse 会崩 |
| 图片落盘而非存 URL | 方舟 URL 有有效期，落盘保证管理端历史记录可长期查看 |
| 不做重试队列 | v1.0 规模下失败即标记 failed，由用户重试 |

## 10. 遗留 / 后续

- 无调用失败自动重试与退避 → 高价值，建议 v1.1 补。
- 图片编辑意图路由（5.0 Flash）未做 → 明确悬空，接口层已预留 `gen_type` 扩展位。
