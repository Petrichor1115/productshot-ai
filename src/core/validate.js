'use strict';

const { BadRequestError } = require('./errors');

/**
 * 轻量参数校验器（无第三方依赖）
 * 用法：
 *   const v = new Validator(req.body);
 *   v.string('username').required().length(3, 20);
 *   v.array('shot_types').enum(['main','scene','selling']);
 *   const data = v.pick(['username','password']); // 返回白名单字段，杜绝多余字段入库
 */
class Validator {
  constructor(payload = {}) {
    this.payload = payload || {};
    this.errors = [];
  }

  _value(field) {
    return this.payload[field];
  }

  _isBlank(v) {
    return v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
  }

  /** 字符串 */
  string(field, { label } = {}) {
    const name = label || field;
    const raw = this._value(field);
    const self = this;
    const api = {
      required() {
        if (self._isBlank(raw)) self.errors.push(`${name}不能为空`);
        return api;
      },
      length(min, max) {
        if (self._isBlank(raw)) return api;
        const len = String(raw).trim().length;
        if (len < min || len > max) self.errors.push(`${name}长度需为 ${min}-${max} 个字符`);
        return api;
      },
      maxLength(max) {
        if (self._isBlank(raw)) return api;
        if (String(raw).length > max) self.errors.push(`${name}不能超过 ${max} 个字符`);
        return api;
      },
      pattern(re, tip) {
        if (self._isBlank(raw)) return api;
        if (!re.test(String(raw))) self.errors.push(tip || `${name}格式不正确`);
        return api;
      },
      /** 归一化为去空格字符串 */
      normalize() {
        if (typeof raw === 'string') self.payload[field] = raw.trim();
        return api;
      },
    };
    return api;
  }

  /** 数字 / 正整数 ID */
  number(field, { label } = {}) {
    const name = label || field;
    const raw = this._value(field);
    const self = this;
    const api = {
      required() {
        if (self._isBlank(raw)) self.errors.push(`${name}不能为空`);
        return api;
      },
      integer() {
        if (self._isBlank(raw)) return api;
        const n = Number(raw);
        if (!Number.isInteger(n)) self.errors.push(`${name}必须为整数`);
        return api;
      },
      min(v) {
        if (self._isBlank(raw)) return api;
        if (Number(raw) < v) self.errors.push(`${name}不能小于 ${v}`);
        return api;
      },
    };
    return api;
  }

  /** 数组 */
  array(field, { label } = {}) {
    const name = label || field;
    const raw = this._value(field);
    const self = this;
    const api = {
      required() {
        if (!Array.isArray(raw) || raw.length === 0) self.errors.push(`${name}不能为空`);
        return api;
      },
      maxLength(max) {
        if (!Array.isArray(raw)) return api;
        if (raw.length > max) self.errors.push(`${name}最多 ${max} 项`);
        return api;
      },
      /** 数组元素必须全部命中枚举，否则报错 */
      enum(allowed, tip) {
        if (!Array.isArray(raw)) return api;
        const bad = raw.filter((x) => !allowed.includes(x));
        if (bad.length) self.errors.push(tip || `${name}取值不合法：${bad.join(', ')}`);
        return api;
      },
    };
    return api;
  }

  /** 单值枚举 */
  oneOf(field, allowed, { label, required = false } = {}) {
    const name = label || field;
    const raw = this._value(field);
    if (this._isBlank(raw)) {
      if (required) this.errors.push(`${name}不能为空`);
      return;
    }
    if (!allowed.includes(raw)) this.errors.push(`${name}取值不合法`);
  }

  /** 自定义断言 */
  assert(condition, message) {
    if (!condition) this.errors.push(message);
  }

  /** 校验失败则抛 400 */
  throwIfInvalid() {
    if (this.errors.length) {
      throw new BadRequestError(this.errors[0], this.errors);
    }
    return this;
  }

  /** 只保留白名单字段，避免多余字段污染业务层与数据库 */
  pick(fields) {
    const out = {};
    for (const f of fields) {
      if (this.payload[f] !== undefined) out[f] = this.payload[f];
    }
    return out;
  }
}

/** 解析分页参数（管理端每页 20 条） */
function parsePagination(query, defaultPageSize = 20) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(query.page_size, 10) || defaultPageSize));
  return { page, pageSize, offset: (page - 1) * pageSize };
}

module.exports = { Validator, parsePagination };
