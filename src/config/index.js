'use strict';

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const path = require('path');

const ROOT = path.resolve(__dirname, '../..');

const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3100),

  /** 服务对外输出的基地址（生成图 URL 拼接用） */
  baseUrl: process.env.BASE_URL || `http://localhost:${process.env.PORT || 3100}`,

  /** JWT 鉴权配置 */
  jwt: {
    secret: process.env.JWT_SECRET || 'productshot-ai-dev-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  /** bcrypt 加密轮次 */
  bcrypt: {
    saltRounds: Number(process.env.BCRYPT_SALT_ROUNDS || 10),
  },

  /** SQLite 数据库文件 */
  db: {
    file: path.resolve(ROOT, process.env.DB_FILE || 'data/productshot.db'),
  },

  /** 静态资源与上传目录 */
  storage: {
    uploadDir: path.resolve(ROOT, process.env.UPLOAD_DIR || 'uploads'),
    publicDir: path.resolve(ROOT, 'public'),
    /** 单张上传图片大小上限：10MB（PRD 4.3.1） */
    maxFileSize: Number(process.env.MAX_FILE_SIZE || 10 * 1024 * 1024),
    /** 允许的 MIME 白名单 */
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    /** 允许的扩展名白名单 */
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp'],
  },

  /** 业务常量 */
  business: {
    /** 单个会话最多上传主图数量（PRD 4.3.1） */
    maxImagesPerSession: 9,
    /** 补充信息字数上限（PRD 4.3.2） */
    maxSupplementLength: 500,
    /** 组图类型合法值 */
    shotTypes: ['main', 'scene', 'selling'],
    /** 自选风格合法值 */
    styles: ['minimal', 'premium', 'natural', 'dark'],
    /** 生图类型合法值（v2.1 扩展点） */
    genTypes: ['product_set'],
    /** 单次生成超时时间（毫秒），PRD 性能要求单张 ≤30s、3 张 ≤90s */
    generateTimeoutMs: Number(process.env.GENERATE_TIMEOUT_MS || 30000),
  },

  /** 火山引擎方舟（豆包 C 2.1 Lite 图像理解 + Seedream 5.0 Pro 图生图） */
  volc: {
    apiKey: process.env.ARK_API_KEY || '',
    baseUrl: process.env.ARK_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3',
    visionModel: process.env.ARK_VISION_MODEL || 'doubao-seed-1-6-vision',
    imageModel: process.env.ARK_IMAGE_MODEL || 'doubao-seedream-5-0-pro',
    /** 未配置 API Key 时自动降级为本地渲染的 Mock 出图，保证全链路可演示 */
    enabled: Boolean(process.env.ARK_API_KEY),
    timeoutMs: Number(process.env.ARK_TIMEOUT_MS || 30000),
  },

  /** 管理员初始账号（首次启动自动创建） */
  admin: {
    username: process.env.ADMIN_USERNAME || 'admin',
    password: process.env.ADMIN_PASSWORD || 'admin123',
  },
};

module.exports = config;
module.exports.ROOT = ROOT;
