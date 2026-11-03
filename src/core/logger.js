'use strict';

const config = require('../config');

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const currentLevel = LEVELS[config.env === 'production' ? 'info' : 'debug'];

function format(level, msg, meta) {
  const ts = new Date().toISOString();
  const base = `[${ts}] [${level.toUpperCase()}] ${msg}`;
  return meta === undefined ? base : `${base} ${safeStringify(meta)}`;
}

function safeStringify(v) {
  try {
    return typeof v === 'string' ? v : JSON.stringify(v);
  } catch {
    return String(v);
  }
}

const logger = {
  debug: (msg, meta) => LEVELS.debug >= currentLevel && console.debug(format('debug', msg, meta)),
  info: (msg, meta) => LEVELS.info >= currentLevel && console.info(format('info', msg, meta)),
  warn: (msg, meta) => LEVELS.warn >= currentLevel && console.warn(format('warn', msg, meta)),
  error: (msg, meta) => LEVELS.error >= currentLevel && console.error(format('error', msg, meta)),
};

module.exports = logger;
