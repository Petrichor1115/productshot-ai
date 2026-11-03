'use strict';

const express = require('express');
const cors = require('cors');
const path = require('path');

const config = require('./config');
const logger = require('./core/logger');
const { ok } = require('./core/response');
const { notFoundHandler, errorHandler } = require('./middleware/error');
const { initDb } = require('./db');

const authRoutes = require('./routes/authRoutes');
const sessionRoutes = require('./routes/sessionRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const generateRoutes = require('./routes/generateRoutes');
const adminRoutes = require('./routes/adminRoutes');

function createApp() {
  // 数据库初始化（幂等建表）
  initDb();

  const app = express();

  app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'] }));
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));

  // 请求日志（非生产环境）
  if (config.env !== 'test') {
    app.use((req, _res, next) => {
      logger.debug(`${req.method} ${req.originalUrl}`);
      next();
    });
  }

  // 静态资源：上传目录（带缓存）与前端页面
  app.use(
    '/uploads',
    express.static(config.storage.uploadDir, {
      maxAge: '7d',
      setHeaders: (res) => res.setHeader('Cache-Control', 'public, max-age=604800'),
    })
  );
  app.use(express.static(config.storage.publicDir, { extensions: ['html'] }));

  // 工程文档（数据库快照等生成的报告）
  app.use('/docs', express.static(path.resolve(__dirname, '../docs')));

  // 健康检查
  app.get('/api/health', (_req, res) =>
    ok(res, { status: 'ok', env: config.env, gen_mode: require('./services/ai/imageGenerator').MODE })
  );

  // REST 路由
  app.use('/api/auth', authRoutes);
  app.use('/api/sessions', sessionRoutes);
  app.use('/api/upload', uploadRoutes);
  app.use('/api/generate', generateRoutes);
  app.use('/api/admin', adminRoutes);

  // 兜底：页面路由交给静态目录，API 路由走 404 JSON
  app.use('/api', notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
