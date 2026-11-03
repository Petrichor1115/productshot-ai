'use strict';

const { getDb } = require('../db');

/** 数据行 → API 输出模型（剥离 password 等敏感字段） */
function toModel(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    role: row.role,
    nickname: row.nickname || row.username,
    status: row.status,
    created_at: row.created_at,
  };
}

const UserRepo = {
  /** 按用户名查询（含密码哈希，仅用于鉴权） */
  findByUsername(username) {
    return getDb().prepare('SELECT * FROM users WHERE username = ?').get(username) || null;
  },

  findById(id) {
    const row = getDb().prepare('SELECT * FROM users WHERE id = ?').get(id);
    return toModel(row);
  },

  create({ username, password, role = 'user', nickname = null }) {
    const info = getDb()
      .prepare(
        `INSERT INTO users (username, password, role, nickname)
         VALUES (?, ?, ?, ?)`
      )
      .run(username, password, role, nickname);
    return UserRepo.findById(info.lastInsertRowid);
  },

  countByRole(role) {
    return getDb().prepare('SELECT COUNT(*) AS c FROM users WHERE role = ?').get(role).c;
  },

  countAll() {
    return getDb().prepare('SELECT COUNT(*) AS c FROM users').get().c;
  },
};

module.exports = UserRepo;
