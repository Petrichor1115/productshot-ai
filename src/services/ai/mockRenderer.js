'use strict';

const fs = require('fs');
const path = require('path');

const { getStyleDef, getShotLabel } = require('./skillTemplate');

/**
 * 本地渲染器（降级方案）
 *
 * 说明：当未配置 ARK_API_KEY（无火山引擎方舟凭据）时，本模块以「确定性本地渲染」
 * 代替 Seedream 出图 —— 把用户上传的原图按所选风格合成到电商版式中，产出 1024×1024 SVG。
 * 目的是保证全链路（上传 → 生成 → 落库 → 预览 → 下载 → 管理端记录）可完整演示，
 * 视觉结果仅用于流程验证，不代表真实 AI 出图效果。配置 Key 后自动切换为 Seedream。
 */

const SIZE = 1024;

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function dataUrlOf(absPath) {
  const ext = path.extname(absPath).slice(1).toLowerCase();
  const mime = ext === 'jpg' ? 'jpeg' : ext === 'webp' ? 'webp' : 'png';
  return `data:image/${mime};base64,${fs.readFileSync(absPath).toString('base64')}`;
}

function gradient(styleDef, id) {
  const base = styleDef.background;
  const accent = styleDef.accent;
  return `
    <defs>
      <linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${base}"/>
        <stop offset="100%" stop-color="${accent}" stop-opacity="0.28"/>
      </linearGradient>
      <radialGradient id="${id}-glow" cx="50%" cy="45%" r="60%">
        <stop offset="0%" stop-color="${accent}" stop-opacity="0.22"/>
        <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
      </radialGradient>
      <filter id="${id}-shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="18" stdDeviation="24" flood-color="#000" flood-opacity="0.18"/>
      </filter>
    </defs>`;
}

/**
 * @param {object} opts
 * @param {string} opts.style 风格值
 * @param {string} opts.shotType main|scene|selling
 * @param {string|null} opts.referenceImageAbsPath 原图绝对路径
 * @param {string} opts.productName 商品名
 * @param {string[]} opts.sellingPoints 卖点
 * @returns {string} SVG 文本
 */
function renderSvg({ style = 'minimal', shotType = 'main', referenceImageAbsPath, productName = '精选商品', sellingPoints = [] }) {
  const styleDef = getStyleDef(style);
  const id = 'g';
  const shotLabel = getShotLabel(shotType);

  const inner = referenceImageAbsPath && fs.existsSync(referenceImageAbsPath)
    ? `<image href="${dataUrlOf(referenceImageAbsPath)}" x="152" y="152" width="720" height="720"
              preserveAspectRatio="xMidYMid meet" filter="url(#${id}-shadow)"/>`
    : `<rect x="152" y="152" width="720" height="720" rx="24" fill="${styleDef.accent}" fill-opacity="0.12" stroke="${styleDef.accent}" stroke-opacity="0.35" stroke-dasharray="12 10"/>
       <text x="512" y="520" font-family="PingFang SC, Microsoft YaHei, sans-serif" font-size="42" fill="${styleDef.accent}" text-anchor="middle">商品占位图</text>`;

  const badge = `
    <g>
      <rect x="60" y="60" rx="20" width="${shotLabel.length * 26 + 44}" height="52" fill="${styleDef.accent}" fill-opacity="0.16"/>
      <text x="${60 + 22}" y="94" font-family="PingFang SC, Microsoft YaHei, sans-serif" font-size="26" font-weight="600" fill="${styleDef.accent}">${escapeXml(shotLabel)}</text>
    </g>`;

  const titleBlock = `
    <text x="512" y="932" font-family="PingFang SC, Microsoft YaHei, sans-serif" font-size="34" font-weight="700"
          fill="${styleDef.text}" text-anchor="middle">${escapeXml(productName)}</text>
    <text x="512" y="972" font-family="PingFang SC, Microsoft YaHei, sans-serif" font-size="22"
          fill="${styleDef.text}" fill-opacity="0.6" text-anchor="middle">${escapeXml(styleDef.label)} · 1024×1024</text>`;

  // 卖点图：额外渲染 3 条卖点标签
  const points = shotType === 'selling' && sellingPoints.length
    ? sellingPoints
        .map((p, i) => {
          const y = 700 + i * 0; // 占位保持结构清晰
          return '';
        })
        .join('')
    : '';

  const sellingBlock =
    shotType === 'selling' && sellingPoints.length
      ? `<g>${sellingPoints
          .map((p, i) => {
            const w = Math.min(300, String(p).length * 24 + 56);
            const x = 512 - w / 2;
            const y = 700 + i * 74;
            return `<g>
              <rect x="${x}" y="${y}" rx="22" width="${w}" height="56" fill="${styleDef.accent}" fill-opacity="0.18"/>
              <circle cx="${x + 28}" cy="${y + 28}" r="10" fill="${styleDef.accent}"/>
              <text x="${x + 48}" y="${y + 36}" font-family="PingFang SC, Microsoft YaHei, sans-serif" font-size="24"
                    fill="${styleDef.text}">${escapeXml(p)}</text>
            </g>`;
          })
          .join('')}</g>`
      : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
     width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  ${gradient(styleDef, id)}
  <rect width="${SIZE}" height="${SIZE}" fill="url(#${id})"/>
  <rect width="${SIZE}" height="${SIZE}" fill="url(#${id}-glow)"/>
  ${inner}
  ${badge}
  ${sellingBlock}
  ${titleBlock}
</svg>`;
}

module.exports = { renderSvg };
