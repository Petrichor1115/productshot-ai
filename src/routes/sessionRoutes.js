'use strict';

const express = require('express');

const SessionService = require('../services/sessionService');
const GenerateService = require('../services/generateService');
const { authenticate } = require('../middleware/auth');
const { Validator } = require('../core/validate');
const { ok, created } = require('../core/response');
const config = require('../config');

const router = express.Router();

router.use(authenticate);

/** GET /api/sessions — 当前用户会话列表 */
router.get('/', (req, res, next) => {
  try {
    return ok(res, SessionService.listMine(req.user.id));
  } catch (err) {
    return next(err);
  }
});

/** POST /api/sessions — 新建会话 */
router.post('/', (req, res, next) => {
  try {
    const v = new Validator(req.body);
    v.string('name', { label: '会话名称' }).required().maxLength(50).normalize();
    v.throwIfInvalid();

    const { name } = v.pick(['name']);
    const session = SessionService.create(req.user.id, { name });
    return created(res, session, '会话创建成功');
  } catch (err) {
    return next(err);
  }
});

/** GET /api/sessions/:id — 会话详情（含配置 + 历史生成结果） */
router.get('/:id', (req, res, next) => {
  try {
    const v = new Validator(req.params);
    v.number('id', { label: '会话 ID' }).required().integer().min(1);
    v.throwIfInvalid();
    return ok(res, SessionService.detail(Number(req.params.id), req.user.id));
  } catch (err) {
    return next(err);
  }
});

/** PATCH /api/sessions/:id — 更新会话配置（主图 / 补充信息 / 组图类型 / 风格） */
router.patch('/:id', (req, res, next) => {
  try {
    const pv = new Validator(req.params);
    pv.number('id', { label: '会话 ID' }).required().integer().min(1);
    pv.throwIfInvalid();

    const v = new Validator(req.body);
    v.array('image_paths', { label: '主图列表' }).maxLength(config.business.maxImagesPerSession);
    v.array('shot_types', { label: '组图类型' }).enum(config.business.shotTypes);
    v.oneOf('style', config.business.styles, { label: '风格' });
    v.string('supplement', { label: '补充信息' }).maxLength(config.business.maxSupplementLength);
    v.throwIfInvalid();

    const payload = {};
    const { image_paths, shot_types, style, supplement } = req.body;
    if (image_paths !== undefined) {
      payload.originalImages = image_paths.filter(Boolean).slice(0, config.business.maxImagesPerSession);
      payload.originalImage = payload.originalImages[0] || null;
    }
    if (shot_types !== undefined) payload.shotTypes = shot_types;
    if (style !== undefined) payload.style = style;
    if (supplement !== undefined) payload.supplement = supplement;

    return ok(res, SessionService.updateConfig(Number(req.params.id), req.user.id, payload), '已保存');
  } catch (err) {
    return next(err);
  }
});

/** DELETE /api/sessions/:id — 删除会话（级联清理生图记录） */
router.delete('/:id', (req, res, next) => {
  try {
    const v = new Validator(req.params);
    v.number('id', { label: '会话 ID' }).required().integer().min(1);
    v.throwIfInvalid();
    return ok(res, SessionService.remove(Number(req.params.id), req.user.id), '会话已删除');
  } catch (err) {
    return next(err);
  }
});

/** GET /api/sessions/:id/results — 会话历史生成结果 */
router.get('/:id/results', (req, res, next) => {
  try {
    return ok(res, GenerateService.listResults(Number(req.params.id), req.user.id));
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
