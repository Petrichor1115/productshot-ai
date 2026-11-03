'use strict';

const express = require('express');

const AdminService = require('../services/adminService');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { ok } = require('../core/response');

const router = express.Router();

// 所有管理端接口均需：有效 JWT + role=admin
router.use(authenticate, requireAdmin);

/** GET /api/admin/stats — 数据看板 4 项统计 */
router.get('/stats', (req, res, next) => {
  try {
    return ok(res, AdminService.stats());
  } catch (err) {
    return next(err);
  }
});

/** GET /api/admin/sessions?page=N — 会话记录列表（每页 20 条） */
router.get('/sessions', (req, res, next) => {
  try {
    return ok(res, AdminService.sessions(req.query));
  } catch (err) {
    return next(err);
  }
});

/** GET /api/admin/records?page=N — 生图记录列表（7 字段，每页 20 条） */
router.get('/records', (req, res, next) => {
  try {
    return ok(res, AdminService.records(req.query));
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
