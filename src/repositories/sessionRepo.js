'use strict';

const { getDb } = require('../db');

const { parseImages, parseShotTypes } = require('../utils/jsonField');

function toModel(row) {
  if (!row) return null;
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    original_image: row.original_image || null,
    original_images: parseImages(row.original_images, row.original_image),
    supplement: row.supplement || '',
    shot_types: parseShotTypes(row.shot_types),
    style: row.style || 'minimal',
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

const SessionRepo = {
  /** 用户端会话列表 */
  listByUser(userId) {
    const rows = getDb()
      .prepare('SELECT * FROM sessions WHERE user_id = ? ORDER BY created_at DESC, id DESC')
      .all(userId);
    return rows.map(toModel);
  },

  findById(id) {
    const row = getDb().prepare('SELECT * FROM sessions WHERE id = ?').get(id);
    return toModel(row);
  },

  /** 校验归属：防止越权访问他人会话 */
  findByIdAndUser(id, userId) {
    const row = getDb()
      .prepare('SELECT * FROM sessions WHERE id = ? AND user_id = ?')
      .get(id, userId);
    return toModel(row);
  },

  create({ userId, name, originalImage = null, originalImages = [], supplement = '', shotTypes = [], style = 'minimal' }) {
    const info = getDb()
      .prepare(
        `INSERT INTO sessions (user_id, name, original_image, original_images, supplement, shot_types, style)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        userId,
        name,
        originalImage,
        JSON.stringify(originalImages || []),
        supplement || '',
        JSON.stringify(shotTypes || []),
        style
      );
    return SessionRepo.findById(info.lastInsertRowid);
  },

  updateConfig(id, { originalImage, originalImages, supplement, shotTypes, style }) {
    const current = getDb().prepare('SELECT * FROM sessions WHERE id = ?').get(id);
    if (!current) return null;
    getDb()
      .prepare(
        `UPDATE sessions
            SET original_image   = ?,
                original_images  = ?,
                supplement       = ?,
                shot_types       = ?,
                style            = ?,
                updated_at       = datetime('now','localtime')
          WHERE id = ?`
      )
      .run(
        originalImage !== undefined ? originalImage : current.original_image,
        JSON.stringify(originalImages !== undefined ? originalImages : parseImages(current.original_images, current.original_image)),
        supplement !== undefined ? supplement : current.supplement,
        JSON.stringify(shotTypes !== undefined ? shotTypes : parseShotTypes(current.shot_types)),
        style !== undefined ? style : current.style,
        id
      );
    return SessionRepo.findById(id);
  },

  /**
   * 删除会话。
   * 依赖数据库外键 ON DELETE CASCADE 清理 generations，
   * 应用层不再手动删除，避免出现孤儿记录。
   */
  remove(id) {
    return getDb().prepare('DELETE FROM sessions WHERE id = ?').run(id).changes > 0;
  },

  countAll() {
    return getDb().prepare('SELECT COUNT(*) AS c FROM sessions').get().c;
  },
};

module.exports = SessionRepo;
