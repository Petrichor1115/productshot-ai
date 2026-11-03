'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const config = require('../config');

const UPLOAD_ROOT = path.resolve(config.storage.uploadDir);

/** 把 /uploads/xxx.png 还原为磁盘绝对路径，并阻断路径穿越 */
function toAbsPath(publicPath) {
  if (!publicPath || typeof publicPath !== 'string') return null;
  const rel = publicPath.replace(/^\/?uploads\//, '');
  const abs = path.resolve(UPLOAD_ROOT, rel);
  if (!abs.startsWith(UPLOAD_ROOT)) return null; // 防目录穿越
  return abs;
}

/** 磁盘绝对路径 → /uploads/xxx 形式的公开 URL */
function toPublicPath(absPath) {
  return `/uploads/${path.relative(UPLOAD_ROOT, absPath).split(path.sep).join('/')}`;
}

/** 生成唯一文件名，保留扩展名 */
function uniqueFilename(ext, prefix = '') {
  const stamp = Date.now().toString(36);
  const rand = crypto.randomBytes(4).toString('hex');
  return `${prefix}${stamp}-${rand}${ext.startsWith('.') ? ext : `.${ext}`}`;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function existsSafe(p) {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

module.exports = { toAbsPath, toPublicPath, uniqueFilename, ensureDir, existsSafe, UPLOAD_ROOT };
