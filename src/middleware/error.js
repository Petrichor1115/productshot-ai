'use strict';

const logger = require('../core/logger');
const { AppError } = require('../core/errors');
const { fail, serverError } = require('../core/response');

/** 404：未匹配的路由 */
function notFoundHandler(req, res) {
  return fail(res, 404, 3001, `接口不存在：${req.method} ${req.originalUrl}`);
}

/**
 * 全局错误处理
 * - AppError（含子类）：按业务码输出
 * - 其余异常：输出 500，不向客户端泄漏堆栈
 */
function errorHandler(err, req, res, _next) {
  if (err instanceof AppError) {
    if (err.httpStatus >= 500) logger.error(err.message, err.stack);
    else logger.warn(`业务异常 ${err.code}：${err.message}`);
    return fail(res, err.httpStatus, err.code, err.message, err.details || null);
  }

  // SQLite 约束冲突（用户名重复等兜底）
  if (err && typeof err.message === 'string' && err.message.includes('UNIQUE constraint failed')) {
    return fail(res, 409, 3002, '数据唯一性冲突（如用户名已存在）');
  }

  logger.error(`未处理异常：${err?.message}`, err?.stack);
  return serverError(res, '服务器内部错误');
}

module.exports = { notFoundHandler, errorHandler };
