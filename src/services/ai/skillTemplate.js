'use strict';

const fs = require('fs');
const path = require('path');

const TEMPLATE_PATH = path.resolve(__dirname, '../../../skills/product-shot-template.json');

let cached = null;

function loadTemplate() {
  if (!cached) {
    cached = JSON.parse(fs.readFileSync(TEMPLATE_PATH, 'utf8'));
  }
  return cached;
}

/** 将 {{变量}} 替换为实际值，未命中的变量移除，避免出现裸占位符 */
function fill(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => (vars[key] !== undefined && vars[key] !== '' ? String(vars[key]) : ''))
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * 构建单个套图类型的提示词
 * @param {string} shotType main | scene | selling
 * @param {object} ctx { productName, category, sellingPoints[], supplement, style }
 */
function buildPrompt(shotType, ctx) {
  const tpl = loadTemplate();
  const shot = tpl.shots[shotType];
  if (!shot) throw new Error(`未知套图类型：${shotType}`);
  const styleDef = tpl.styles[ctx.style] || tpl.styles.minimal;

  return fill(shot.prompt_template, {
    product_name: ctx.productName || tpl.vision_extraction.fallback.name,
    category: ctx.category || tpl.vision_extraction.fallback.category,
    style_keywords: styleDef.keywords,
    supplement: ctx.supplement || '无',
    selling_points: (ctx.sellingPoints || []).join('、') || '质感、细节、性价比',
  });
}

function buildVisionPrompt(ctx) {
  const tpl = loadTemplate();
  const ve = tpl.vision_extraction;
  return {
    systemPrompt: ve.system_prompt,
    userPrompt: fill(ve.user_prompt_template, { supplement: ctx.supplement || '无' }),
    fallback: ve.fallback,
  };
}

function getStyleDef(style) {
  const tpl = loadTemplate();
  return tpl.styles[style] || tpl.styles.minimal;
}

function getShotLabel(shotType) {
  const tpl = loadTemplate();
  return tpl.shots[shotType]?.label || shotType;
}

function getStyleLabel(style) {
  return getStyleDef(style).label;
}

module.exports = { loadTemplate, buildPrompt, buildVisionPrompt, getStyleDef, getShotLabel, getStyleLabel };
