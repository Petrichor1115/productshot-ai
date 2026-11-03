'use strict';

/**
 * 统一响应格式
 * 成功：{ code: 0, message: 'ok', data: <payload>, timestamp }
 * 失败：{ code: <业务码>, message: '错误描述', data: null, timestamp }
 *
 * 约定：HTTP 状态码表达「传输层语义」，code 表达「业务语义」。
 * code = 0 表示业务成功；非 0 为业务错误码（见 errors.js）。
 */

/** 成功响应（默认 200） */
function ok(res, data = null, message = 'ok', httpStatus = 200) {
  return res.status(httpStatus).json({
    code: 0,
    message,
    data,
    timestamp: Date.now(),
  });
}

/** 创建成功响应（201） */
function created(res, data = null, message = '创建成功') {
  return ok(res, data, message, 201);
}

/** 失败响应 */
function fail(res, httpStatus, code, message, data = null) {
  return res.status(httpStatus).json({
    code,
    message,
    data,
    timestamp: Date.now(),
  });
}

/** 参数校验失败（400 / 1001） */
function badRequest(res, message = '参数校验失败', data = null) {
  return fail(res, 400, 1001, message, data);
}

/** 未授权 / token 失效（401 / 2001） */
function unauthorized(res, message = '未登录或登录已过期') {
  return fail(res, 401, 2001, message);
}

/** 无权限（403 / 2002） */
function forbidden(res, message = '无权限访问该资源') {
  return fail(res, 403, 2002, message);
}

/** 资源不存在（404 / 3001） */
function notFound(res, message = '资源不存在') {
  return fail(res, 404, 3001, message);
}

/** 资源冲突（409 / 3002，如用户名已存在） */
function conflict(res, message = '资源冲突') {
  return fail(res, 409, 3002, message);
}

/** 业务规则拒绝（422 / 4001） */
function unprocessable(res, message = '业务规则校验未通过') {
  return fail(res, 422, 4001, message);
}

/** 服务端错误（500 / 5001） */
function serverError(res, message = '服务器内部错误') {
  return fail(res, 500, 5001, message);
}

/** 下游服务（AI 供应商）错误（502 / 5002） */
function upstreamError(res, message = 'AI 服务调用失败') {
  return fail(res, 502, 5002, message);
}

module.exports = {
  ok,
  created,
  fail,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  unprocessable,
  serverError,
  upstreamError,
};
