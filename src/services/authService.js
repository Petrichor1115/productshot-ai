'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const config = require('../config');
const UserRepo = require('../repositories/userRepo');
const { ConflictError, UnauthorizedError, AppError } = require('../core/errors');

/** 签发 JWT：载荷仅含身份标识与角色，不携带敏感信息 */
function signToken(user) {
  return jwt.sign(
    { sub: String(user.id), username: user.username, role: user.role },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
}

const AuthService = {
  /**
   * 注册：默认角色 user，禁止通过接口自提权为 admin
   * @returns {{ token:string, user:object }}
   */
  async register({ username, password }) {
    const exist = UserRepo.findByUsername(username);
    if (exist) throw new ConflictError('用户名已存在');

    const hash = await bcrypt.hash(password, config.bcrypt.saltRounds);
    const user = UserRepo.create({ username, password: hash, role: 'user', nickname: username });

    return { token: signToken(user), user };
  },

  /**
   * 登录
   * @param {object} params
   * @param {string} [params.requireRole] 传入 'admin' 时校验管理员身份
   */
  async login({ username, password, requireRole }) {
    const record = UserRepo.findByUsername(username);
    // 用户不存在与密码错误返回同一提示，避免账号枚举
    if (!record) throw new UnauthorizedError('用户名或密码错误');

    const matched = await bcrypt.compare(password, record.password);
    if (!matched) throw new UnauthorizedError('用户名或密码错误');

    if (record.status !== 'active') throw new UnauthorizedError('账号已被停用，请联系管理员');

    if (requireRole && record.role !== requireRole) {
      throw new UnauthorizedError(requireRole === 'admin' ? '该账号无管理员权限' : '无权限');
    }

    const user = {
      id: record.id,
      username: record.username,
      role: record.role,
      nickname: record.nickname || record.username,
    };
    return { token: signToken(user), user };
  },

  /** 校验 token 并返回当前用户；失效或用户已删除时抛 401 */
  verifyToken(token) {
    try {
      const payload = jwt.verify(token, config.jwt.secret);
      const user = UserRepo.findById(Number(payload.sub));
      if (!user || user.status !== 'active') throw new Error('用户状态异常');
      return user;
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new UnauthorizedError('未登录或登录已过期');
    }
  },

  /** 首次启动确保管理员账号存在（PRD 管理端登录页 4.1） */
  async ensureAdminUser() {
    const { username, password } = config.admin;
    const exist = UserRepo.findByUsername(username);
    if (exist) return exist;
    const hash = await bcrypt.hash(password, config.bcrypt.saltRounds);
    return UserRepo.create({ username, password: hash, role: 'admin', nickname: '管理员' });
  },
};

module.exports = AuthService;
