'use strict';

const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const config = require('../config');
const logger = require('../core/logger');
const { AppError } = require('../core/errors');

const SCHEMA_PATH = path.resolve(__dirname, '../../db/schema.sql');

let db = null;

/** 初始化数据库连接：执行建表脚本（幂等），开启外键与 WAL */
function initDb() {
  if (db) return db;

  fs.mkdirSync(path.dirname(config.db.file), { recursive: true });

  db = new DatabaseSync(config.db.file);
  // 外键约束：SQLite 默认关闭，必须逐连接开启
  db.exec('PRAGMA foreign_keys = ON;');
  // WAL：读写并发下显著提升吞吐，避免「database is locked」
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA synchronous = NORMAL;');

  const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
  db.exec(schema);

  logger.info(`数据库已就绪：${config.db.file}`);
  return db;
}

function getDb() {
  if (!db) throw new AppError('数据库尚未初始化', { httpStatus: 500, code: 5001 });
  return db;
}

/** 简易事务包装（node:sqlite 提供 exec('BEGIN') 语义） */
function transaction(fn) {
  const instance = getDb();
  instance.exec('BEGIN');
  try {
    const result = fn(instance);
    instance.exec('COMMIT');
    return result;
  } catch (err) {
    instance.exec('ROLLBACK');
    throw err;
  }
}

process.on('exit', () => {
  try {
    db?.close();
  } catch {
    /* ignore */
  }
});

module.exports = { initDb, getDb, transaction };
