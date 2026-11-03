'use strict';

/**
 * 演示数据初始化
 * 创建：1 个演示用户（demo01/demo123）+ 3 个会话 + 各自 3 张套图记录（含真实落盘图片）
 * 用途：让管理端「数据看板 / 会话记录 / 生图记录」开箱即有数据可看
 * 用法：node scripts/seed.js
 */

const fs = require('fs');
const path = require('path');

const config = require('../src/config');
const { initDb } = require('../src/db');
const UserRepo = require('../src/repositories/userRepo');
const SessionRepo = require('../src/repositories/sessionRepo');
const GenerationRepo = require('../src/repositories/generationRepo');
const bcrypt = require('bcryptjs');
const { demoProductImage } = require('../src/utils/png');
const { renderSvg } = require('../src/services/ai/mockRenderer');
const { uniqueFilename, toPublicPath, ensureDir } = require('../src/utils/file');

const DEMO = [
  {
    name: '无线蓝牙耳机套图',
    style: 'minimal',
    supplement: '1. 产品名称：SoundFree 无线蓝牙耳机\n2. 尺寸参数：单耳 4.2g\n3. 核心卖点：主动降噪、30h 续航、半入耳无压迫',
  },
  {
    name: '雾屿香氛主图',
    style: 'premium',
    supplement: '1. 产品名称：雾屿香氛 50ml\n2. 尺寸参数：50ml / 高 11cm\n3. 核心卖点：木质香调、留香 12 小时、磨砂瓶身',
  },
  {
    name: '便携咖啡杯场景',
    style: 'natural',
    supplement: '1. 产品名称：随行咖啡杯 380ml\n2. 尺寸参数：380ml / 316 不锈钢内胆\n3. 核心卖点：6 小时保温、一键弹盖、单手可握',
  },
];

(async function seed() {
  initDb();
  ensureDir(config.storage.uploadDir);

  const username = 'demo01';
  const password = 'demo123';

  let user = UserRepo.findByUsername(username);
  if (!user) {
    const hash = await bcrypt.hash(password, config.bcrypt.saltRounds);
    user = UserRepo.create({ username, password: hash, role: 'user', nickname: '演示用户' });
    console.log(`创建演示用户：${username} / ${password}`);
  } else {
    console.log(`演示用户已存在：${username}`);
  }

  // 原图（同一张商品演示图，模拟用户上传的主图）
  const originalAbs = path.join(config.storage.uploadDir, uniqueFilename('.png', 'up-demo-'));
  fs.writeFileSync(originalAbs, demoProductImage(512));
  const originalPath = toPublicPath(originalAbs);

  for (const item of DEMO) {
    const session = SessionRepo.create({
      userId: user.id,
      name: item.name,
      originalImage: originalPath,
      originalImages: [originalPath],
      supplement: item.supplement,
      shotTypes: ['main', 'scene', 'selling'],
      style: item.style,
    });

    for (const shotType of ['main', 'scene', 'selling']) {
      const gen = GenerationRepo.create({ sessionId: session.id, shotType, prompt: `[seed] ${item.name} / ${shotType}` });
      const svg = renderSvg({
        style: item.style,
        shotType,
        referenceImageAbsPath: originalAbs,
        productName: item.name,
        sellingPoints: ['质感出众', '细节考究', '性价比高'],
      });
      const abs = path.join(config.storage.uploadDir, uniqueFilename('.svg', 'gen-demo-'));
      fs.writeFileSync(abs, svg, 'utf8');
      GenerationRepo.markSuccess(gen.id, { savedPath: toPublicPath(abs), durationMs: 3800 + Math.floor(Math.random() * 2600) });
    }
    console.log(`  会话「${item.name}」已生成 3 张套图`);
  }

  console.log('\n演示数据初始化完成：');
  console.log(`  用户：${username} / ${password}`);
  console.log(`  管理员：${config.admin.username} / ${config.admin.password}`);
  console.log(`  会话数：${SessionRepo.countAll()}，生图记录数：${GenerationRepo.countAll()}`);
})();
