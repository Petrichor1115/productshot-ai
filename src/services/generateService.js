'use strict';

const config = require('../config');
const { getDb } = require('../db');
const SessionRepo = require('../repositories/sessionRepo');
const GenerationRepo = require('../repositories/generationRepo');
const { NotFoundError, UnprocessableError } = require('../core/errors');
const { generateShotSet, MODE } = require('./ai/imageGenerator');
const { toAbsPath } = require('../utils/file');

/**
 * 套图生成服务
 * 流程（PRD 5.2）：
 *   1. 校验会话归属与参数
 *   2. 校验主图至少 1 张且不超过 9 张
 *   3. 为每张待生成图预占 pending 记录（前端可展示「等待生成」）
 *   4. 视觉理解 → 拼提示词 → 逐张出图 → 更新状态
 *   5. 同步会话配置，返回生成结果
 */
const GenerateService = {
  async generate(userId, payload) {
    const { sessionId, imagePaths, supplement, shotTypes, style } = payload;

    const session = SessionRepo.findByIdAndUser(sessionId, userId);
    if (!session) throw new NotFoundError('会话不存在或无访问权限');

    // ---- 业务规则校验 ----
    const images = (imagePaths || []).filter(Boolean);
    if (images.length === 0) throw new UnprocessableError('请先上传至少 1 张商品主图');
    if (images.length > config.business.maxImagesPerSession) {
      throw new UnprocessableError(`最多只能上传 ${config.business.maxImagesPerSession} 张主图`);
    }
    const missing = images.filter((p) => !toAbsPath(p));
    if (missing.length) throw new UnprocessableError('主图路径不合法');

    const types = (shotTypes || []).filter((t) => config.business.shotTypes.includes(t));
    if (types.length === 0) throw new UnprocessableError('请至少勾选一个组图类型');

    const finalStyle = config.business.styles.includes(style) ? style : 'minimal';

    // ---- 预占记录：让前端立刻渲染「等待生成」占位 ----
    const placeholders = types.map((shotType) =>
      GenerationRepo.create({ sessionId, genType: 'product_set', shotType })
    );

    // ---- 会话配置落库 ----
    SessionRepo.updateConfig(sessionId, {
      originalImage: images[0],
      originalImages: images,
      supplement: supplement || '',
      shotTypes: types,
      style: finalStyle,
    });

    // ---- 逐张出图，单张失败不影响其余 ----
    const { vision } = await generateShotSet({
      imagePaths: images,
      supplement: supplement || '',
      shotTypes: types,
      style: finalStyle,
      async onShotStart({ shotType, prompt }) {
        const gen = placeholders.find((p) => p.shot_type === shotType);
        GenerationRepo.markGenerating(gen.id);
        // 保存最终 prompt，便于回溯与质检
        getDb().prepare('UPDATE generations SET prompt = ? WHERE id = ?').run(prompt, gen.id);
        return { ...gen, prompt };
      },
      async onShotDone(gen, result) {
        if (result.status === 'success') {
          return GenerationRepo.markSuccess(gen.id, { savedPath: result.savedPath, durationMs: result.durationMs });
        }
        return GenerationRepo.markFailed(gen.id, { errorMsg: result.errorMsg, durationMs: result.durationMs });
      },
    });

    const generations = GenerationRepo.listBySession(sessionId);
    const successCount = generations.filter((g) => g.status === 'success').length;
    const totalDuration = generations.reduce((sum, g) => sum + (g.duration_ms || 0), 0);

    return {
      session_id: Number(sessionId),
      mode: MODE,
      vision,
      style: finalStyle,
      total: placeholders.length,
      success_count: successCount,
      failed_count: placeholders.length - successCount,
      duration_ms: totalDuration,
      results: generations.filter((g) => placeholders.some((p) => p.id === g.id)),
    };
  },

  /** 会话历史结果（用户端回填） */
  listResults(sessionId, userId) {
    const session = SessionRepo.findByIdAndUser(sessionId, userId);
    if (!session) throw new NotFoundError('会话不存在或无访问权限');
    return GenerationRepo.listBySession(sessionId);
  },
};

module.exports = GenerateService;
