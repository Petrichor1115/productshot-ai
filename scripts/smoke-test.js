'use strict';

/**
 * 端到端冒烟测试（无需人工点击）
 * 覆盖：健康检查 → 注册/登录 → 会话 → 上传 → 生成 → 会话详情 → 管理端 3 个接口 → 页面可访问
 * 用法：node scripts/smoke-test.js
 */

const fs = require('fs');
const path = require('path');

const BASE = process.env.BASE_URL || 'http://127.0.0.1:3100';
const { demoProductImage } = require('../src/utils/png');

let passed = 0;
let failed = 0;

function assert(name, cond, extra) {
  if (cond) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    console.log(`  FAIL  ${name}${extra ? ' → ' + JSON.stringify(extra) : ''}`);
  }
}

async function call(pathname, { method = 'GET', body, token, formData } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';
  const res = await fetch(BASE + pathname, {
    method,
    headers,
    body: formData || (body ? JSON.stringify(body) : undefined),
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

(async function main() {
  const stamp = Date.now();
  const username = `smoke${stamp}`;
  const password = 'test123456';

  console.log(`\n=== ProductShot AI 冒烟测试 === ${BASE}\n`);

  // 1. 健康检查
  console.log('[1] 健康检查');
  const health = await call('/api/health');
  assert('GET /api/health 返回 200', health.status === 200, health.json);
  console.log(`     出图模式：${health.json?.data?.gen_mode}`);

  // 2. 注册
  console.log('\n[2] 认证模块');
  const reg = await call('/api/auth/register', { method: 'POST', body: { username, password } });
  assert('注册成功返回 token', reg.status === 201 && !!reg.json?.data?.token, reg.json);
  const dup = await call('/api/auth/register', { method: 'POST', body: { username, password } });
  assert('重复注册返回 409', dup.status === 409, dup.json);
  const badReg = await call('/api/auth/register', { method: 'POST', body: { username: 'ab', password: '123' } });
  assert('用户名 <3 字符返回 400', badReg.status === 400, badReg.json);
  const badLogin = await call('/api/auth/login', { method: 'POST', body: { username, password: 'wrong-password' } });
  assert('密码错误返回 401', badLogin.status === 401, badLogin.json);

  const login = await call('/api/auth/login', { method: 'POST', body: { username, password } });
  const token = login.json?.data?.token;
  assert('登录成功', login.status === 200 && !!token, login.json);

  const noAuth = await call('/api/sessions');
  assert('无 token 访问会话列表返回 401', noAuth.status === 401, noAuth.json);

  // 3. 会话
  console.log('\n[3] 会话模块');
  const sess = await call('/api/sessions', { method: 'POST', body: { name: '冒烟测试会话' }, token });
  const sessionId = sess.json?.data?.id;
  assert('创建会话成功', sess.status === 201 && !!sessionId, sess.json);

  const list = await call('/api/sessions', { token });
  assert('会话列表包含新会话', Array.isArray(list.json?.data) && list.json.data.some((s) => s.id === sessionId));

  // 4. 上传
  console.log('\n[4] 上传模块');
  const pngBuf = demoProductImage(512);
  const fd = new FormData();
  fd.append('images', new Blob([pngBuf], { type: 'image/png' }), 'demo.png');
  const up = await call('/api/upload', { method: 'POST', token, formData: fd });
  const imgPath = up.json?.data?.files?.[0]?.path;
  assert('上传图片成功并返回路径', up.status === 201 && !!imgPath, up.json);

  const fdBad = new FormData();
  fdBad.append('images', new Blob([Buffer.from('not-an-image')], { type: 'text/plain' }), 'a.txt');
  const upBad = await call('/api/upload', { method: 'POST', token, formData: fdBad });
  assert('非图片格式被拒绝（400）', upBad.status === 400, upBad.json);

  // 5. 生成
  console.log('\n[5] 生成模块');
  const genNoImg = await call('/api/generate', {
    method: 'POST', token,
    body: { session_id: sessionId, image_paths: [], shot_types: ['main'], style: 'minimal' },
  });
  assert('未上传主图返回 422', genNoImg.status === 422, genNoImg.json);

  const genBadType = await call('/api/generate', {
    method: 'POST', token,
    body: { session_id: sessionId, image_paths: [imgPath], shot_types: ['unknown'], style: 'minimal' },
  });
  assert('非法组图类型返回 400', genBadType.status === 400, genBadType.json);

  const gen = await call('/api/generate', {
    method: 'POST', token,
    body: {
      session_id: sessionId,
      image_paths: [imgPath],
      supplement: '1. 产品名称：雾屿香氛\n2. 尺寸参数：50ml\n3. 核心卖点：木质香调、留香12小时',
      shot_types: ['main', 'scene', 'selling'],
      style: 'premium',
    },
  });
  assert('生成成功', gen.status === 200 && gen.json?.data?.success_count === 3, gen.json?.data && {
    success: gen.json.data.success_count, failed: gen.json.data.failed_count,
  });

  const detail = await call(`/api/sessions/${sessionId}`, { token });
  const d = detail.json?.data;
  assert('会话详情回填配置', detail.status === 200 && d.style === 'premium' && d.shot_types.length === 3, d && {
    style: d.style, shot_types: d.shot_types, images: d.original_images?.length,
  });
  assert('会话详情含 3 条生成结果', d && d.generations.length === 3, d && d.generations.map((g) => g.status));
  const successUrls = (d?.generations || []).filter((g) => g.status === 'success').map((g) => g.image_url);
  assert('生成图片 URL 可访问', successUrls.length === 3, successUrls);
  for (const u of successUrls) {
    const r = await fetch(BASE + u);
    assert(`静态资源 ${u} 返回 200`, r.status === 200);
  }

  // 6. 越权校验
  console.log('\n[6] 权限校验');
  const other = await call('/api/auth/register', { method: 'POST', body: { username: username + 'b', password } });
  const otherToken = other.json?.data?.token;
  const cross = await call(`/api/sessions/${sessionId}`, { token: otherToken });
  assert('访问他人会话返回 404', cross.status === 404, cross.json);
  const adminByUser = await call('/api/admin/stats', { token });
  assert('普通用户访问管理接口返回 403', adminByUser.status === 403, adminByUser.json);

  // 7. 管理端
  console.log('\n[7] 管理端');
  const adminLogin = await call('/api/auth/login', {
    method: 'POST', body: { username: 'admin', password: 'admin123', role: 'admin' },
  });
  const adminToken = adminLogin.json?.data?.token;
  assert('管理员登录成功', adminLogin.status === 200 && adminLogin.json?.data?.user?.role === 'admin', adminLogin.json);

  const userAsAdmin = await call('/api/auth/login', {
    method: 'POST', body: { username, password, role: 'admin' },
  });
  assert('普通用户以 admin 身份登录被拒（401）', userAsAdmin.status === 401, userAsAdmin.json);

  const stats = await call('/api/admin/stats', { token: adminToken });
  const s = stats.json?.data || {};
  assert('统计接口返回 4 项指标', stats.status === 200 &&
    typeof s.total_users === 'number' && typeof s.total_sessions === 'number' &&
    typeof s.total_images === 'number' && typeof s.today_images === 'number', s);

  const adminSessions = await call('/api/admin/sessions?page=1', { token: adminToken });
  const asr = adminSessions.json?.data?.list?.[0] || {};
  assert('管理端会话记录含 5 字段', adminSessions.status === 200 &&
    'username' in asr && 'session_name' in asr && 'created_at' in asr &&
    'image_count' in asr && 'last_generated_at' in asr, asr);
  assert('会话记录时间精确到分钟', typeof asr.created_at === 'string' && asr.created_at.length === 16, asr.created_at);

  const records = await call('/api/admin/records?page=1', { token: adminToken });
  const rr = records.json?.data?.list?.[0] || {};
  assert('管理端生图记录含 7 字段', records.status === 200 &&
    ['username', 'session_name', 'created_at', 'gen_type', 'shot_type', 'status', 'image_url']
      .every((k) => k in rr), rr);
  assert('生图记录时间精确到分钟', typeof rr.created_at === 'string' && rr.created_at.length === 16, rr.created_at);
  assert('分页返回 total/totalPages', records.json?.data?.total > 0 && records.json?.data?.totalPages > 0, {
    total: records.json?.data?.total, pages: records.json?.data?.totalPages,
  });

  // 8. 页面可访问
  console.log('\n[8] 前端页面');
  for (const p of ['/index.html', '/workspace.html', '/admin.html', '/admin-dashboard.html',
                   '/css/tokens.css', '/js/workspace.js', '/js/admin.js']) {
    const r = await fetch(BASE + p);
    assert(`页面/资源 ${p} 可访问`, r.status === 200);
  }

  // 9. 删除会话级联
  console.log('\n[9] 级联清理');
  const del = await call(`/api/sessions/${sessionId}`, { method: 'DELETE', token });
  assert('删除会话成功', del.status === 200, del.json);
  const after = await call('/api/sessions', { token });
  assert('会话列表已移除', !after.json.data.some((x) => x.id === sessionId));

  console.log(`\n=== 结果：${passed} 通过 / ${failed} 失败 ===\n`);
  process.exit(failed === 0 ? 0 : 1);
})().catch((e) => {
  console.error('冒烟测试异常：', e);
  process.exit(1);
});
