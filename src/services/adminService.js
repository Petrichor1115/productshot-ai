'use strict';

const { getDb } = require('../db');
const UserRepo = require('../repositories/userRepo');
const SessionRepo = require('../repositories/sessionRepo');
const GenerationRepo = require('../repositories/generationRepo');
const { parsePagination } = require('../core/validate');

/** 时间字符串统一截断到分钟：'2026-10-26 18:41:02' → '2026-10-26 18:41' */
function toMinute(value) {
  if (!value) return null;
  return String(value).slice(0, 16);
}

const AdminService = {
  /** 数据看板 4 项指标（PRD 5.1） */
  stats() {
    return {
      total_users: UserRepo.countByRole('user'),
      total_sessions: SessionRepo.countAll(),
      total_images: GenerationRepo.countSuccessAll(),
      today_images: GenerationRepo.countToday(),
      total_records: GenerationRepo.countAll(),
    };
  },

  /**
   * 会话记录列表（PRD 6）
   * JOIN users 取用户名，聚合 generations 取图片数与最近生成时间
   */
  sessions(query) {
    const { page, pageSize, offset } = parsePagination(query, 20);
    const db = getDb();

    const rows = db
      .prepare(
        `SELECT s.id,
                u.username        AS username,
                s.name            AS session_name,
                s.created_at      AS created_at,
                COUNT(g.id)       AS image_count,
                MAX(g.created_at) AS last_generated_at
           FROM sessions s
           JOIN users u       ON u.id = s.user_id
           LEFT JOIN generations g ON g.session_id = s.id
          GROUP BY s.id
          ORDER BY s.created_at DESC, s.id DESC
          LIMIT ? OFFSET ?`
      )
      .all(pageSize, offset)
      .map((r) => ({
        id: r.id,
        username: r.username,
        session_name: r.session_name,
        created_at: toMinute(r.created_at),
        image_count: r.image_count,
        last_generated_at: r.last_generated_at ? toMinute(r.last_generated_at) : '-',
      }));

    const total = db.prepare('SELECT COUNT(*) AS c FROM sessions').get().c;
    return { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)), list: rows };
  },

  /**
   * 生图记录列表（PRD 7）
   * JOIN users / sessions，7 字段齐全，时间精确到分钟
   */
  records(query) {
    const { page, pageSize, offset } = parsePagination(query, 20);
    const db = getDb();

    const rows = db
      .prepare(
        `SELECT g.id,
                u.username   AS username,
                s.name       AS session_name,
                g.created_at AS created_at,
                g.gen_type   AS gen_type,
                g.shot_type  AS shot_type,
                g.status     AS status,
                g.saved_path AS image_url
           FROM generations g
           JOIN sessions s ON s.id = g.session_id
           JOIN users u    ON u.id = s.user_id
          ORDER BY g.created_at DESC, g.id DESC
          LIMIT ? OFFSET ?`
      )
      .all(pageSize, offset)
      .map((r) => ({
        id: r.id,
        username: r.username,
        session_name: r.session_name,
        created_at: toMinute(r.created_at),
        gen_type: r.gen_type,
        shot_type: r.shot_type,
        status: r.status,
        image_url: r.image_url || null,
      }));

    const total = db.prepare('SELECT COUNT(*) AS c FROM generations').get().c;
    return { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)), list: rows };
  },
};

module.exports = AdminService;
