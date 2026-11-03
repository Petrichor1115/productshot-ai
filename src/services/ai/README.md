# AI 出图模块（src/services/ai）

套图生成的 AI 编排层：把「商品原图 + 用户补充信息」变成三张电商套图，并对上游失败做降级兜底。

---

## 1. 文件职责

| 文件 | 职责 |
|------|------|
| `imageGenerator.js` | 出图编排器：视觉理解 → 拼提示词 → 逐张出图 → 回调落库；对外暴露 `generateShotSet()` 与当前 `MODE` |
| `volcClient.js` | 火山引擎方舟客户端：`analyzeProduct()` 图像理解、`generateImage()` 图生图，基于内置 `fetch`，零第三方依赖 |
| `skillTemplate.js` | Skill 模板读取与渲染：`buildPrompt()` 拼单张提示词、`buildVisionPrompt()` 拼视觉理解提示词 |
| `mockRenderer.js` | 本地降级渲染：按风格 / 组图类型把原图合成为 1024×1024 SVG 版式 |

---

## 2. 两种运行模式

| 模式 | 触发条件 | 行为 |
|------|----------|------|
| `volc-ark` | `.env` 中配置了 `ARK_API_KEY` | 真实调用豆包视觉理解 + Seedream 出图，落盘 PNG |
| `local-mock` | 未配置 `ARK_API_KEY` | 不访问外网，按模板合成 SVG 套图，保证全链路可演示 |

两种模式对外接口完全一致，前端与数据库无需感知。上游调用失败时（超时、401、额度不足等），
`imageGenerator` 会记录告警并**自动回退**到 `mockRenderer`，单张失败不影响同批次其余图片。

当前模式在启动日志与 `GET /api/health` 的 `data.gen_mode` 字段中明示，不会把降级结果伪装成真实 AI 出图。

---

## 3. 调用链

```
GenerateService.generate()
        │
        ▼
generateShotSet({ imagePaths, supplement, shotTypes, style, onShotStart, onShotDone })
        │
        ├─ 1. analyze()            ── 有 Key：volcClient.analyzeProduct()
        │                             无 Key / 失败：从补充信息正则提取
        │                          产出 { name, category, sellingPoints[] }
        │
        ├─ 2. buildPrompt(shotType, ctx)   ── skills/product-shot-template.json
        │                                    风格关键词 + 组图目标 + 卖点
        │
        ├─ 3. renderOne({ prompt, style, shotType, ... })
        │       ├─ 有 Key：volcClient.generateImage() → PNG 落盘 uploads/
        │       └─ 无 Key / 失败：mockRenderer.renderSvg() → SVG 落盘 uploads/
        │
        └─ 4. onShotDone()         ── 更新 generations 表状态、耗时、错误信息
```

---

## 4. 配置项（.env）

| 变量 | 说明 | 默认 |
|------|------|------|
| `ARK_API_KEY` | 方舟 API Key，留空即降级 | 空 |
| `ARK_BASE_URL` | 方舟 API 域名 | `https://ark.cn-beijing.volces.com/api/v3` |
| `ARK_VISION_MODEL` | 视觉理解模型 | `doubao-seed-1-6-vision` |
| `ARK_IMAGE_MODEL` | 图像生成模型 | `doubao-seedream-5-0-pro` |
| `ARK_TIMEOUT_MS` | 单次上游调用超时 | `30000` |
| `GENERATE_TIMEOUT_MS` | 单张出图超时（业务侧） | `30000` |

接入步骤、模型 ID、请求示例与常见报错处理见
[`docs/integration/火山引擎方舟打通文档.md`](../../../docs/integration/火山引擎方舟打通文档.md)。

---

## 5. 扩展点

- **新增组图类型**：在 `skills/product-shot-template.json` 的 `shots` 中加一项，并在
  `src/config/index.js` 的 `business.shotTypes` 白名单中登记。
- **新增风格**：在模板 `styles` 中加一项，同步 `business.styles`，`mockRenderer` 会自动读取背景色 / 强调色。
- **更换模型**：只改 `.env` 的 `ARK_*_MODEL`，无需改代码；Lite / Pro 版本切换同理。
- **接入并行出图**：把 `imageGenerator.js` 中逐张 `for` 循环改为 `Promise.all` 即可，`onShotStart/onShotDone`
  的回调式设计已为并发预留接口。
