'use strict';

const express = require('express');

const { upload, handleUploadError } = require('../middleware/upload');
const { authenticate } = require('../middleware/auth');
const { ok, created } = require('../core/response');
const config = require('../config');
const { toAbsPath, toPublicPath } = require('../utils/file');
const { BadRequestError } = require('../core/errors');

const router = express.Router();

/**
 * POST /api/upload — 上传商品主图
 * 单张：字段名 image；多张：字段名 images（最多 9 张，PRD 4.3.1）
 * 响应：{ path, url, filename, size } 或 { files: [...] }
 */
router.post('/', authenticate, (req, res, next) => {
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'images', maxCount: config.business.maxImagesPerSession },
  ])(req, res, (err) => {
    if (err) return handleUploadError(err, req, res, next);
    try {
      const files = [...(req.files?.image || []), ...(req.files?.images || [])];
      if (!files.length) throw new BadRequestError('请选择要上传的图片');

      const mapped = files.map((f) => ({
        path: toPublicPath(f.path),
        url: toPublicPath(f.path),
        filename: f.filename,
        originalname: f.originalname,
        size: f.size,
        mimetype: f.mimetype,
      }));

      return created(res, { files: mapped, file: mapped[0] }, '上传成功');
    } catch (e) {
      return next(e);
    }
  });
});

module.exports = router;
