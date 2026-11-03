'use strict';

const { getDb } = require('../db');

function toModel(row) {
  if (!row) return null;
  return {
    id: row.id,
    session_id: row.session_id,
    gen_type: row.gen_type,
    shot_type: row.shot_type,
    saved_path: row.saved_path,
    image_url: row.saved_path,
    prompt: row.prompt,
    status: row.status,
    error_msg: row.error_msg,
    duration_ms: row.duration_ms,
    created_at: row.created_at,
  };
}

const GenerationRepo = {
  /** 预占记录：生成前写入 pending，保证前端可展示「等待生成」并支持管理端实时看到进行中 */
  create({ sessionId, genType = 'product_set', shotType, prompt = '' }) {
    const info = getDb()
      .prepare(
        `INSERT INTO generations (session_id, gen_type, shot_type, prompt, status)
         VALUES (?, ?, ?, ?, 'pending')`
      )
      .run(sessionId, genType, shotType, prompt);
    return GenerationRepo.findById(info.lastInsertRowid);
  },

  findById(id) {
    const row = getDb().prepare('SELECT * FROM generations WHERE id = ?').get(id);
    return toModel(row);
  },

  listBySession(sessionId) {
    return getDb()
      .prepare('SELECT * FROM generations WHERE session_id = ? ORDER BY created_at ASC, id ASC')
      .all(sessionId)
      .map(toModel);
  },

  markGenerating(id) {
    getDb()
      .prepare(`UPDATE generations SET status = 'generating', updated_at = datetime('now','localtime') WHERE id = ?`)
      .run(id);
  },

  markSuccess(id, { savedPath, durationMs }) {
    getDb()
      .prepare(
        `UPDATE generations
            SET status = 'success', saved_path = ?, duration_ms = ?,
                error_msg = NULL, updated_at = datetime('now','localtime')
          WHERE id = ?`
      )
      .run(savedPath, durationMs ?? null, id);
    return GenerationRepo.findById(id);
  },

  markFailed(id, { errorMsg, durationMs }) {
    getDb()
      .prepare(
        `UPDATE generations
            SET status = 'failed', error_msg = ?, duration_ms = ?,
                updated_at = datetime('now','localtime')
          WHERE id = ?`
      )
      .run(String(errorMsg || '生成失败').slice(0, 500), durationMs ?? null, id);
    return GenerationRepo.findById(id);
  },

  countBySession(sessionId) {
    return getDb().prepare('SELECT COUNT(*) AS c FROM generations WHERE session_id = ?').get(sessionId).c;
  },

  countAll() {
    return getDb().prepare('SELECT COUNT(*) AS c FROM generations').get().c;
  },

  countToday() {
    // created_at 形如 '2026-10-26 18:41:02'，取日期前缀匹配当天
    return getDb()
      .prepare(`SELECT COUNT(*) AS c FROM generations WHERE substr(created_at, 1, 10) = date('now','localtime')`)
      .get().c;
  },

  countSuccessAll() {
    return getDb().prepare(`SELECT COUNT(*) AS c FROM generations WHERE status = 'success'`).get().c;
  },

  /** 会话的最近一次生成时间 */
  lastGeneratedAt(sessionId) {
    const row = getDb()
      .prepare('SELECT MAX(created_at) AS t FROM generations WHERE session_id = ?')
      .get(sessionId);
    return row?.t || null;
  },
};

module.exports = GenerationRepo;
