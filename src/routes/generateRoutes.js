'use strict';

const express = require('express');

const GenerateService = require('../services/generateService');
const { authenticate } = require('../middleware/auth');
const { Validator } = require('../core/validate');
const { ok } = require('../core/response');
const config = require('../config');

const router = express.Router();

/**
 * POST /api/generate — 生成商品套图
 * body: {
 *   session_id,
 *   image_paths: string[],   // v2.0 多图（兼容 imagePath / image_path 单图）
 *   supplement: string,      // 补充信息，≤500 字
 *   shot_types: string[],    // main / scene / selling
 *   style: string            // minimal / premium / natural / dark
 * }
 */
router.post('/', authenticate, async (req, res, next) => {
  try {
    const v = new Validator(req.body);
    v.number('session_id', { label: '会话 ID' }).required().integer().min(1);
    v.string('supplement', { label: '补充信息' }).maxLength(config.business.maxSupplementLength);
    v.oneOf('style', config.business.styles, { label: '风格' });
    v.array('shot_types', { label: '组图类型' }).maxLength(config.business.shotTypes.length).enum(config.business.shotTypes);
    v.throwIfInvalid();

    // 兼容 v1.2 单图字段：imagePath / image_path
    const rawPaths = req.body.image_paths || req.body.imagePaths || [];
    const single = req.body.imagePath || req.body.image_path;
    let imagePaths = Array.isArray(rawPaths) ? rawPaths : [];
    if (!imagePaths.length && single) imagePaths = [single];
    imagePaths = imagePaths.filter((p) => typeof p === 'string' && p.trim()).slice(0, config.business.maxImagesPerSession);

    if (imagePaths.length === 0) throw new (require('../core/errors').UnprocessableError)('请先上传至少 1 张商品主图');

    const result = await GenerateService.generate(req.user.id, {
      sessionId: Number(req.body.session_id),
      imagePaths,
      supplement: req.body.supplement || '',
      shotTypes: req.body.shot_types || config.business.shotTypes,
      style: req.body.style || 'minimal',
    });

    return ok(res, result, '生成完成');
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
