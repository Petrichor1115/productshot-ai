'use strict';

/**
 * 应用错误基类
 * httpStatus 决定 HTTP 状态码，code 决定响应体中的业务错误码。
 */
class AppError extends Error {
  constructor(message, { httpStatus = 500, code = 5001, details = null } = {}) {
    super(message);
    this.name = 'AppError';
    this.httpStatus = httpStatus;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

/** 400 参数错误 */
class BadRequestError extends AppError {
  constructor(message = '参数校验失败', details = null) {
    super(message, { httpStatus: 400, code: 1001, details });
  }
}

/** 401 未认证 */
class UnauthorizedError extends AppError {
  constructor(message = '未登录或登录已过期') {
    super(message, { httpStatus: 401, code: 2001 });
  }
}

/** 403 无权限 */
class ForbiddenError extends AppError {
  constructor(message = '无权限访问该资源') {
    super(message, { httpStatus: 403, code: 2002 });
  }
}

/** 404 资源不存在 */
class NotFoundError extends AppError {
  constructor(message = '资源不存在') {
    super(message, { httpStatus: 404, code: 3001 });
  }
}

/** 409 资源冲突 */
class ConflictError extends AppError {
  constructor(message = '资源冲突') {
    super(message, { httpStatus: 409, code: 3002 });
  }
}

/** 422 业务规则拒绝 */
class UnprocessableError extends AppError {
  constructor(message = '业务规则校验未通过', details = null) {
    super(message, { httpStatus: 422, code: 4001, details });
  }
}

/** 502 下游（AI 供应商）错误 */
class UpstreamError extends AppError {
  constructor(message = 'AI 服务调用失败', details = null) {
    super(message, { httpStatus: 502, code: 5002, details });
  }
}

module.exports = {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  UnprocessableError,
  UpstreamError,
};
