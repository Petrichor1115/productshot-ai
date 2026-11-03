'use strict';

const AuthService = require('../services/authService');
const { UnauthorizedError, ForbiddenError } = require('../core/errors');

/** 从 Authorization 头提取 Bearer token */
function extractToken(req) {
  const header = req.headers.authorization || '';
  const m = header.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

/**
 * 认证中间件：校验 JWT 并挂载 req.user
 * 失败统一抛 401，由 errorHandler 转成统一响应格式
 */
function authenticate(req, res, next) {
  const token = extractToken(req);
  if (!token) return next(new UnauthorizedError('未登录或登录已过期'));
  try {
    req.user = AuthService.verifyToken(token);
    return next();
  } catch (err) {
    return next(err);
  }
}

/** 管理员鉴权：必须在 authenticate 之后使用 */
function requireAdmin(req, res, next) {
  if (!req.user) return next(new UnauthorizedError());
  if (req.user.role !== 'admin') return next(new ForbiddenError('无管理员权限'));
  return next();
}

module.exports = { authenticate, requireAdmin, extractToken };
