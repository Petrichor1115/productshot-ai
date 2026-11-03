'use strict';

const express = require('express');

const AuthService = require('../services/authService');
const { Validator } = require('../core/validate');
const { ok, created } = require('../core/response');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/auth/register — 用户注册
 * body: { username, password }
 */
router.post('/register', async (req, res, next) => {
  try {
    const v = new Validator(req.body);
    v.string('username', { label: '用户名' }).required().length(3, 20).normalize();
    v.string('password', { label: '密码' }).required().length(6, 40);
    v.throwIfInvalid();

    const data = v.pick(['username', 'password']);
    const result = await AuthService.register(data);
    return created(res, result, '注册成功');
  } catch (err) {
    return next(err);
  }
});

/**
 * POST /api/auth/login — 登录（用户端 / 管理端共用）
 * body: { username, password, role? }  role=admin 时校验管理员身份
 */
router.post('/login', async (req, res, next) => {
  try {
    const v = new Validator(req.body);
    v.string('username', { label: '账号' }).required().normalize();
    v.string('password', { label: '密码' }).required();
    v.oneOf('role', ['user', 'admin'], { label: '角色' });
    v.throwIfInvalid();

    const { username, password, role } = req.body;
    const result = await AuthService.login({ username, password, requireRole: role });
    return ok(res, result, '登录成功');
  } catch (err) {
    return next(err);
  }
});

/** GET /api/auth/me — 当前登录用户信息（前端鉴权校验用） */
router.get('/me', authenticate, (req, res) => ok(res, req.user));

/** POST /api/auth/logout — 登出（JWT 无状态，前端清除 token 即可；此接口用于服务端埋点） */
router.post('/logout', authenticate, (req, res) => ok(res, { username: req.user.username }, '已登出'));

module.exports = router;
