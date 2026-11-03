# Skill 模板 · 电商商品套图

`product-shot-template.json` 是本项目内置的「套图生成 Skill」，把商品信息与风格偏好翻译成大模型可执行的提示词。

---

## 1. 结构说明

| 字段 | 作用 |
|------|------|
| `skill` / `version` / `name` / `description` | 元信息，版本与前端展示用 |
| `size` | 输出尺寸，当前统一 `1024x1024` |
| `styles` | 4 种风格：`minimal` 简约白底 / `premium` 高级布光 / `natural` 自然场景 / `dark` 暗调质感。每种含展示名、英文关键词与配色 |
| `shots` | 3 种组图：`main` 产品主图 / `scene` 使用场景 / `selling` 卖点介绍。每种含目标说明与提示词模板 |
| `vision_extraction` | 视觉理解提示词：让豆包从原图输出 `{name, category, sellingPoints}`，并给出兜底值 |

提示词模板支持 `{{变量}}` 占位符：

| 占位符 | 来源 |
|--------|------|
| `{{product_name}}` | 视觉模型识别结果，失败时取补充信息或兜底值 |
| `{{category}}` | 同上 |
| `{{style_keywords}}` | 所选风格的英文关键词 |
| `{{supplement}}` | 用户填写的补充信息（≤500 字） |
| `{{selling_points}}` | 3 条卖点，`、` 连接 |

未命中的占位符会被移除，不会把裸 `{{xxx}}` 传给模型（见 `src/services/ai/skillTemplate.js` 的 `fill()`）。

---

## 2. 使用方式

模板由 `src/services/ai/skillTemplate.js` 在首次调用时读入并缓存，业务代码只需：

```javascript
const { buildPrompt } = require('./skillTemplate');

const prompt = buildPrompt('main', {
  productName: '无线蓝牙耳机',
  category: '数码配件',
  sellingPoints: ['主动降噪', '30h 续航', '半入耳无压迫'],
  supplement: '品牌 SoundFree',
  style: 'minimal',
});
```

新增组图类型或风格时，同步修改 `src/config/index.js` 中的 `business.shotTypes` / `business.styles` 白名单，
否则请求参数会被过滤掉。
