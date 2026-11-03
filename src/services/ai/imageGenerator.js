'use strict';

const fs = require('fs');
const path = require('path');

const config = require('../../config');
const logger = require('../../core/logger');
const { toAbsPath, toPublicPath, uniqueFilename, ensureDir } = require('../../utils/file');
const { buildPrompt } = require('./skillTemplate');
const { getStyleDef } = require('./skillTemplate');

/**
 * 出图编排器
 * 优先走火山引擎方舟（豆包视觉理解 + Seedream 出图）；
 * 未配置 ARK_API_KEY 时降级为本地确定性渲染（mockRenderer），保证链路完整可演示。
 */

const MODE = config.volc.enabled ? 'volc-ark' : 'local-mock';

/** 从补充信息中兜底提取商品名 / 卖点（无视觉模型时使用） */
function deriveFromSupplement(supplement = '') {
  const lines = String(supplement)
    .split(/[\n；;。]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const nameLine = lines.find((l) => /产品名称|商品名称|品牌|名称[:：]/.test(l));
  const name = nameLine ? nameLine.replace(/^.*?[:：]\s*/, '').slice(0, 40) : '';
  const points = lines.filter((l) => l !== nameLine).slice(0, 3);
  return {
    name: name || '精选商品',
    category: '通用商品',
    sellingPoints: points.length ? points : ['质感出众', '细节考究', '性价比高'],
  };
}

async function analyze(imageAbsPath, supplement) {
  if (!config.volc.enabled) return deriveFromSupplement(supplement);
  try {
    const { analyzeProduct } = require('./volcClient');
    const result = await analyzeProduct(imageAbsPath, supplement);
    return result;
  } catch (err) {
    logger.warn(`视觉理解失败，回退补充信息提取：${err.message}`);
    return deriveFromSupplement(supplement);
  }
}

/** 单张出图：返回落盘后的公开路径 */
async function renderOne({ prompt, referenceImageAbsPath, style, shotType, productName, sellingPoints }) {
  if (config.volc.enabled) {
    try {
      const { generateImage } = require('./volcClient');
      const buffer = await generateImage({
        prompt,
        referenceImageAbsPath,
        size: config.volc.imageModel.includes('seedream') ? '1024x1024' : '1024x1024',
      });
      ensureDir(config.storage.uploadDir);
      const abs = path.join(config.storage.uploadDir, uniqueFilename('.png', 'gen-'));
      fs.writeFileSync(abs, buffer);
      return toPublicPath(abs);
    } catch (err) {
      logger.warn(`Seedream 出图失败，降级本地渲染：${err.message}`);
    }
  }

  const { renderSvg } = require('./mockRenderer');
  const svg = require('./mockRenderer').renderSvg({
    style,
    shotType,
    referenceImageAbsPath,
    productName,
    sellingPoints,
  });
  ensureDir(config.storage.uploadDir);
  const abs = path.join(config.storage.uploadDir, uniqueFilename('.svg', 'gen-'));
  fs.writeFileSync(abs, svg, 'utf8');
  return toPublicPath(abs);
}

/**
 * 生成一组套图
 * @param {object} params
 * @param {string[]} params.imagePaths 原图公开路径数组（/uploads/xxx）
 * @param {string} params.supplement 补充信息
 * @param {string[]} params.shotTypes 需要生成的套图类型
 * @param {string} params.style 风格
 * @param {(gen:object)=>Promise<void>} params.onShotStart
 * @param {(gen:object, result:object)=>Promise<void>} params.onShotDone
 */
async function generateShotSet({
  imagePaths = [],
  supplement = '',
  shotTypes = ['main', 'scene', 'selling'],
  style = 'minimal',
  onShotStart,
  onShotDone,
}) {
  const refPublic = imagePaths.find(Boolean) || null;
  const refAbs = refPublic ? toAbsPath(refPublic) : null;

  const vision = await analyze(refAbs, supplement);
  const ctx = {
    productName: vision.name,
    category: vision.category,
    sellingPoints: vision.sellingPoints,
    supplement,
    style,
  };

  const results = [];
  for (const shotType of shotTypes) {
    const prompt = buildPrompt(shotType, ctx);
    const startedAt = Date.now();

    const gen = await onShotStart({ shotType, prompt });
    try {
      const savedPath = await renderOne({
        prompt,
        referenceImageAbsPath: refAbs,
        style,
        shotType,
        productName: ctx.productName,
        sellingPoints: ctx.sellingPoints,
      });
      const durationMs = Date.now() - startedAt;
      const updated = await onShotDone(gen, { status: 'success', savedPath, durationMs });
      results.push(updated);
    } catch (err) {
      const durationMs = Date.now() - startedAt;
      logger.error(`套图生成失败 [${shotType}]：${err.message}`);
      const updated = await onShotDone(gen, { status: 'failed', errorMsg: err.message, durationMs });
      results.push(updated);
    }
  }

  return {
    mode: MODE,
    vision: { name: ctx.productName, category: ctx.category, sellingPoints: ctx.sellingPoints },
    style,
    results,
  };
}

module.exports = { generateShotSet, MODE, deriveFromSupplement };
module.exports.getStyleDef = getStyleDef;
