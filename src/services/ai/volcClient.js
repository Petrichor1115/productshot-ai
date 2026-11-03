'use strict';

const fs = require('fs');
const path = require('path');

const config = require('../../config');
const logger = require('../../core/logger');
const { UpstreamError } = require('../../core/errors');

/**
 * 火山引擎方舟客户端（零第三方依赖，使用内置 fetch）
 * - 豆包视觉模型：图像理解 / 卖点提取
 * - Seedream：图生图 / 文生图
 *
 * 未配置 ARK_API_KEY 时由 imageGenerator 自动降级为本地渲染，不会调用本模块。
 */

const TIMEOUT_MS = config.volc.timeoutMs;

async function request(url, options, timeoutMs = TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    const text = await res.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }
    if (!res.ok) {
      logger.error(`方舟接口异常 ${res.status}`, json);
      throw new UpstreamError(`AI 服务返回异常（HTTP ${res.status}）`, json);
    }
    return json;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new UpstreamError('AI 服务调用超时');
    }
    if (err instanceof UpstreamError) throw err;
    throw new UpstreamError(`AI 服务调用失败：${err.message}`);
  } finally {
    clearTimeout(timer);
  }
}

/** 图片 → data URL（方舟多模态入参格式） */
function toDataUrl(absPath) {
  const ext = path.extname(absPath).slice(1).toLowerCase();
  const mime = ext === 'jpg' ? 'jpeg' : ext === 'webp' ? 'webp' : ext === 'png' ? 'png' : 'png';
  const base64 = fs.readFileSync(absPath).toString('base64');
  return `data:image/${mime};base64,${base64}`;
}

/**
 * 图像理解：提取商品名称、类目、3 条卖点
 * @returns {Promise<{name:string, category:string, sellingPoints:string[]}>}
 */
async function analyzeProduct(imageAbsPath, supplement = '') {
  const { buildVisionPrompt } = require('./skillTemplate');
  const { systemPrompt, userPrompt, fallback } = buildVisionPrompt({ supplement });
  const { baseUrl, apiKey, visionModel } = config.volc;

  const body = {
    model: visionModel,
    messages: [
      { role: 'system', content: [{ type: 'text', text: systemPrompt }] },
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: toDataUrl(imageAbsPath) } },
          { type: 'text', text: userPrompt },
        ],
      },
    ],
    temperature: 0.4,
  };

  const json = await request(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const content = json?.choices?.[0]?.message?.content;
  const text = typeof content === 'string' ? content : Array.isArray(content) ? content.map((c) => c.text || '').join('') : '';

  try {
    const cleaned = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return {
      name: String(parsed.name || fallback.name).slice(0, 60),
      category: String(parsed.category || fallback.category).slice(0, 40),
      sellingPoints: (Array.isArray(parsed.sellingPoints) ? parsed.sellingPoints : fallback.sellingPoints)
        .slice(0, 3)
        .map((s) => String(s).slice(0, 40)),
    };
  } catch {
    logger.warn('视觉模型返回非 JSON，回退默认卖点', text.slice(0, 200));
    return fallback;
  }
}

/**
 * 图生图 / 文生图
 * @returns {Promise<Buffer>} 图片二进制
 */
async function generateImage({ prompt, referenceImageAbsPath, size = '1024x1024' }) {
  const { baseUrl, apiKey, imageModel } = config.volc;
  const body = {
    model: imageModel,
    prompt,
    size,
    response_format: 'b64_json',
    watermark: false,
  };
  if (referenceImageAbsPath) {
    body.image = toDataUrl(referenceImageAbsPath);
  }

  const json = await request(
    `${baseUrl}/images/generations`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    },
    config.business.generateTimeoutMs
  );

  const b64 = json?.data?.[0]?.b64_json || json?.data?.[0]?.image;
  if (!b64) throw new UpstreamError('AI 服务未返回图片数据');
  return Buffer.from(b64, 'base64');
}

module.exports = { analyzeProduct, generateImage, toDataUrl, isEnabled: () => config.volc.enabled };
