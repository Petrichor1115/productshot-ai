'use strict';

const { createApp } = require('./src/app');
const config = require('./src/config');
const logger = require('./src/core/logger');
const AuthService = require('./src/services/authService');

async function bootstrap() {
  const app = createApp();

  // 首次启动自动创建管理员账号（PRD 管理端登录页 4.1：admin / admin123）
  await AuthService.ensureAdminUser();
  logger.info(`管理员账号已就绪：${config.admin.username}`);

  const server = app.listen(config.port, () => {
    logger.info(`ProductShot AI 服务已启动： http://localhost:${config.port}`);
    logger.info(`出图模式：${require('./src/services/ai/imageGenerator').MODE}`);
    if (!config.volc.enabled) {
      logger.warn('未检测到 ARK_API_KEY，出图降级为「本地确定性渲染」，配置 Key 后自动切换火山引擎方舟 Seedream');
    }
  });

  const shutdown = (signal) => {
    logger.info(`收到 ${signal}，正在关闭服务...`);
    server.close(() => process.exit(0));
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch((err) => {
  logger.error('服务启动失败', err.stack || String(err));
  process.exit(1);
});
