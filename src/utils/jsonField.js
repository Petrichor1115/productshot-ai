'use strict';

/** 安全解析 JSON 字段，失败时回退默认值，避免脏数据导致整个接口 500 */
function safeParse(raw, fallback) {
  if (raw === null || raw === undefined || raw === '') return fallback;
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

/** 原图路径数组：优先取 original_images，回退 original_image 单图字段（v1.2 兼容） */
function parseImages(rawImages, rawImage) {
  const list = safeParse(rawImages, null);
  if (list) return list.filter(Boolean);
  return rawImage ? [rawImage] : [];
}

/** 组图类型开关：解析失败回退默认全选 */
function parseShotTypes(raw) {
  const list = safeParse(raw, null);
  if (!list) return ['main', 'scene', 'selling'];
  return list.filter((x) => ['main', 'scene', 'selling'].includes(x));
}

/** 序列化为 JSON 字符串（数组/空数组统一处理） */
function stringifyArray(arr) {
  return JSON.stringify(Array.isArray(arr) ? arr : []);
}

module.exports = { safeParse, parseImages, parseShotTypes, stringifyArray };
