'use strict';

const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

const config = require('../config');
const { ensureDir, uniqueFilename } = require('../utils/file');
const { BadRequestError } = require('../core/errors');

ensureDir(config.storage.uploadDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, config.storage.uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, uniqueFilename(ext || '.png', 'up-'));
  },
});

/** 文件过滤：MIME 与扩展名双重白名单校验（PRD：JPG / PNG / WEBP） */
function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  const extOk = config.storage.allowedExtensions.includes(ext);
  const mimeOk = config.storage.allowedMimeTypes.includes(file.mimetype);
  if (!extOk || !mimeOk) {
    return cb(new BadRequestError('请上传 JPG / PNG / WEBP 格式的图片'));
  }
  return cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: config.storage.maxFileSize, files: 9 },
});

/** multer 自身错误（如文件超限）转成统一业务错误 */
function handleUploadError(err, req, res, next) {
  if (!err) return next();
  if (err instanceof multer.MulterError) {
    const map = {
      LIMIT_FILE_SIZE: '图片大小不能超过 10MB',
      LIMIT_FILE_COUNT: '一次最多上传 9 张图片',
      LIMIT_UNEXPECTED_FILE: '上传字段名不正确',
    };
    return next(new BadRequestError(map[err.code] || `上传失败：${err.message}`));
  }
  return next(err);
}

/** 随机 token，无实际业务用途，仅保留工具函数以备扩展 */
const _randomToken = () => crypto.randomBytes(8).toString('hex');

module.exports = { upload, handleUploadError, _randomToken };
