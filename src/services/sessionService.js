'use strict';

const SessionRepo = require('../repositories/sessionRepo');
const GenerationRepo = require('../repositories/generationRepo');
const { NotFoundError, BadRequestError } = require('../core/errors');

const SessionService = {
  listMine(userId) {
    return SessionRepo.listByUser(userId);
  },

  /**
   * 会话详情：附带该会话下已生成的图片结果
   * 用户端切换会话时用于回填中列参数与右列结果（PRD 6.2）
   */
  detail(sessionId, userId) {
    const session = SessionRepo.findByIdAndUser(sessionId, userId);
    if (!session) throw new NotFoundError('会话不存在或无访问权限');
    const generations = GenerationRepo.listBySession(sessionId);
    return { ...session, generations };
  },

  create(userId, { name }) {
    const trimmed = String(name || '').trim();
    if (!trimmed) throw new BadRequestError('会话名称不能为空');
    if (trimmed.length > 50) throw new BadRequestError('会话名称不能超过 50 个字符');
    return SessionRepo.create({ userId, name: trimmed });
  },

  /**
   * 更新会话配置（主图 / 补充信息 / 组图类型 / 风格）
   * 生成前由前端调用，保证「所见即所存」
   */
  updateConfig(sessionId, userId, payload) {
    const session = SessionRepo.findByIdAndUser(sessionId, userId);
    if (!session) throw new NotFoundError('会话不存在或无访问权限');
    return SessionRepo.updateConfig(sessionId, payload);
  },

  remove(sessionId, userId) {
    const session = SessionRepo.findByIdAndUser(sessionId, userId);
    if (!session) throw new NotFoundError('会话不存在或无访问权限');
    // generations 由外键 ON DELETE CASCADE 级联清理
    SessionRepo.remove(sessionId);
    return { id: Number(sessionId) };
  },
};

module.exports = SessionService;
