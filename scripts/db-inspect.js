'use strict';

/**
 * 数据库快照导出
 * 读取当前 SQLite，生成一份自包含 HTML 报告：表结构 / 索引 / 数据行 / 生成图预览
 * 用法：node scripts/db-inspect.js
 * 输出：docs/tools/db-inspect.html
 */

const fs = require('fs');
const path = require('path');

const { initDb, getDb } = require('../src/db');
const config = require('../src/config');

initDb();
const db = getDb();

function esc(v) {
  return String(v === null || v === undefined ? '' : v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// 由字符码构造正则，避免源码中出现反斜杠转义
var _SP = ' ';
var _TAB = String.fromCharCode(9);
var _CR = String.fromCharCode(13);
var _NL = String.fromCharCode(10);
var WS_RE = new RegExp('[' + _SP + _TAB + _CR + _NL + ']+', 'g');
var LEAD_SLASH_RE = new RegExp('^/+');

function cell(v) {
  if (v === null || v === undefined) return '<span class="null">NULL</span>';
  if (v === '') return '<span class="null">（空）</span>';
  return esc(v);
}

/** 长文本（JSON / 提示词）截断展示 */
function cellLong(v, max = 90) {
  if (v === null || v === undefined || v === '') return '<span class="null">NULL</span>';
  const s = String(v);
  return s.length > max
    ? `<span title="${esc(s)}">${esc(s.slice(0, max))}…</span>`
    : esc(s);
}

function tableBlock(title, note, columns, rows, renderer) {
  const head = columns.map((c) => `<th>${esc(c)}</th>`).join('');
  const body = rows.length
    ? rows.map((r) => '<tr>' + renderer(r).map((td) => `<td>${td}</td>`).join('') + '</tr>').join('')
    : `<tr><td colspan="${columns.length}" class="empty-row">暂无数据</td></tr>`;
  return `
    <section class="card">
      <div class="card__head">
        <h2>${esc(title)}</h2>
        <span class="card__note">${esc(note)}</span>
        <span class="badge">${rows.length} 行</span>
      </div>
      <div class="table-scroll"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>
    </section>`;
}

const users = db.prepare('SELECT * FROM users ORDER BY id').all();
const sessions = db.prepare('SELECT * FROM sessions ORDER BY id DESC').all();
const generations = db.prepare('SELECT * FROM generations ORDER BY id DESC').all();
const indexes = db
  .prepare("SELECT name, tbl_name, sql FROM sqlite_master WHERE type='index' AND sql IS NOT NULL ORDER BY tbl_name, name")
  .all();
const tables = db
  .prepare("SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
  .all();

const statusCls = { success: 'ok', failed: 'bad', generating: 'run', pending: 'run' };
const statusText = { success: '成功', failed: '失败', generating: '进行中', pending: '排队中' };
const shotText = { main: '产品主图', scene: '使用场景', selling: '卖点介绍' };

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>数据库快照 · ProductShot AI</title>
<style>
  :root {
    --brand: #5b7bee; --bg: #f4f6fb; --surface: #fff; --line: #e5e7eb;
    --text-1: #111827; --text-2: #4b5563; --text-3: #6b7280; --text-4: #9ca3af;
    --ok: #10b981; --bad: #ef4444; --run: #3b82f6;
  }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: "PingFang SC","Microsoft YaHei",-apple-system,sans-serif;
         background: var(--bg); color: var(--text-2); font-size: 13px; line-height: 1.6; }
  header { background: var(--surface); border-bottom: 1px solid var(--line); padding: 20px 32px; }
  header h1 { margin: 0; font-size: 20px; color: var(--text-1); font-weight: 600; }
  header p { margin: 4px 0 0; color: var(--text-4); font-size: 12px; }
  main { padding: 24px 32px 48px; max-width: 1440px; }
  .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
  .stat { background: var(--surface); border: 1px solid var(--line); border-radius: 12px; padding: 16px 20px; }
  .stat b { display: block; font-size: 26px; color: var(--brand); font-variant-numeric: tabular-nums; }
  .stat span { font-size: 12px; color: var(--text-3); }
  .card { background: var(--surface); border: 1px solid var(--line); border-radius: 12px;
          margin-bottom: 20px; overflow: hidden; }
  .card__head { display: flex; align-items: center; gap: 12px; padding: 14px 20px;
                border-bottom: 1px solid var(--line); background: #f9fafb; }
  .card__head h2 { margin: 0; font-size: 15px; color: var(--text-1); font-weight: 600; }
  .card__note { font-size: 12px; color: var(--text-4); }
  .badge { margin-left: auto; background: #eef2ff; color: var(--brand); font-size: 12px;
           padding: 2px 10px; border-radius: 999px; font-weight: 500; }
  .table-scroll { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { text-align: left; padding: 10px 12px; background: #f9fafb; color: var(--text-3);
       font-weight: 500; white-space: nowrap; border-bottom: 1px solid var(--line); }
  td { padding: 10px 12px; border-bottom: 1px solid #f1f2f5; vertical-align: middle; }
  tbody tr:hover { background: #f9fafb; }
  .null { color: var(--text-4); font-style: italic; }
  .empty-row { text-align: center; color: var(--text-4); padding: 24px; }
  .pill { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; }
  .pill i { width: 6px; height: 6px; border-radius: 50%; display: inline-block; }
  .pill.ok i { background: var(--ok); } .pill.ok { color: #047857; }
  .pill.bad i { background: var(--bad); } .pill.bad { color: #b91c1c; }
  .pill.run i { background: var(--run); } .pill.run { color: #1d4ed8; }
  .thumb { width: 44px; height: 44px; border-radius: 6px; object-fit: cover;
           border: 1px solid #eef0f4; background: #f3f4f6; cursor: zoom-in; }
  code { background: #f3f4f6; padding: 1px 6px; border-radius: 4px; font-size: 11px;
         font-family: Consolas, Monaco, monospace; color: #374151; }
  pre { margin: 0; padding: 16px 20px; background: #0f172a; color: #cbd5e1; font-size: 11.5px;
        line-height: 1.7; overflow-x: auto; font-family: Consolas, Monaco, monospace; }
  .modal { position: fixed; inset: 0; background: rgba(17,24,39,.6); display: flex;
           align-items: center; justify-content: center; z-index: 99; padding: 32px; }
  .modal img { max-width: 100%; max-height: 88vh; border-radius: 12px; background: #fff; }
</style>
</head>
<body>
<header>
  <h1>数据库快照 · ProductShot AI</h1>
  <p>${esc(config.db.file)} · 导出时间 ${new Date().toLocaleString('zh-CN')}</p>
</header>
<main>
  <div class="stats">
    <div class="stat"><b>${users.length}</b><span>users 用户</span></div>
    <div class="stat"><b>${sessions.length}</b><span>sessions 会话</span></div>
    <div class="stat"><b>${generations.length}</b><span>generations 生图记录</span></div>
    <div class="stat"><b>${indexes.length}</b><span>索引</span></div>
  </div>

  ${tableBlock('users · 用户表', 'bcrypt 哈希密码，role 区分普通用户与管理员',
    ['id', 'username', 'password (哈希)', 'role', 'nickname', 'status', 'created_at'], users,
    (r) => [cell(r.id), `<b>${esc(r.username)}</b>`, cellLong(r.password, 34),
            cell(r.role), cell(r.nickname), cell(r.status), cell(r.created_at)])}

  ${tableBlock('sessions · 会话表', 'original_images 为 JSON 数组（最多 9 张主图），shot_types 为组图开关 JSON',
    ['id', 'user_id', 'name', 'original_images', 'supplement', 'shot_types', 'style', 'created_at'], sessions,
    (r) => [cell(r.id), cell(r.user_id), `<b>${esc(r.name)}</b>`, cellLong(r.original_images, 40),
            cellLong(r.supplement, 40), cellLong(r.shot_types, 40), cell(r.style), cell(r.created_at)])}

  ${tableBlock('generations · 生图记录表', '点击缩略图可查看大图；status 四态：pending / generating / success / failed',
    ['id', 'session_id', 'gen_type', 'shot_type', 'status', 'saved_path', 'duration_ms', 'created_at', '缩略图'], generations,
    (r) => [
      cell(r.id), cell(r.session_id), cell(r.gen_type),
      cell(shotText[r.shot_type] || r.shot_type),
      `<span class="pill ${statusCls[r.status] || 'run'}"><i></i>${statusText[r.status] || r.status}</span>`,
      cellLong(r.saved_path, 32),
      cell(r.duration_ms === null ? null : r.duration_ms + ' ms'),
      cell(r.created_at),
      r.saved_path && r.status === 'success'
        ? '<img class="thumb" src="/' + String(r.saved_path).replace(LEAD_SLASH_RE, '') +
          '" alt="缩略图" onclick="zoom(this.src)"/>'
        : '<span class="null">—</span>',
    ])}

  ${tableBlock('索引清单', '索引规划详见 db/schema.sql 末尾注释',
    ['索引名', '所属表', '定义'], indexes,
    (r) => [cell(r.name), cell(r.tbl_name), '<code>' + esc(String(r.sql).replace(WS_RE, ' ')) + '</code>'])}

  <section class="card">
    <div class="card__head"><h2>建表 DDL</h2><span class="card__note">来自 db/schema.sql 的实际落库结果</span></div>
    <pre>${esc(tables.map((t) => t.sql).join(';\n\n'))};</pre>
  </section>
</main>
<script>
  function zoom(src) {
    var m = document.createElement('div');
    m.className = 'modal';
    m.innerHTML = '<img src="' + src + '"/>';
    m.onclick = function () { m.remove(); };
    document.body.appendChild(m);
  }
</script>
</body>
</html>`;

const outDir = path.resolve(__dirname, '../docs/tools');
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, 'db-inspect.html');
fs.writeFileSync(outFile, html, 'utf8');

console.log('数据库快照已生成：' + outFile);
console.log(`  users=${users.length}  sessions=${sessions.length}  generations=${generations.length}  indexes=${indexes.length}`);
console.log('提示：缩略图需在服务运行中（http://localhost:3100）查看，可直接在浏览器打开下列地址：');
console.log('  http://localhost:3100/docs/tools/db-inspect.html');
