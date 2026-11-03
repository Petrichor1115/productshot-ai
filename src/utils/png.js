'use strict';

/**
 * 极简 PNG 编码器（零依赖）：用于生成测试图片与演示素材
 * 支持 RGB 原始像素写入，输出标准 PNG（8bit truecolor）
 */

const zlib = require('zlib');

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

/**
 * @param {number} width
 * @param {number} height
 * @param {(x:number,y:number)=>[number,number,number]} shader
 * @returns {Buffer} PNG 二进制
 */
function encodePng(width, height, shader) {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  let p = 0;
  for (let y = 0; y < height; y++) {
    raw[p++] = 0; // filter type: None
    for (let x = 0; x < width; x++) {
      const [r, g, b] = shader(x, y);
      raw[p++] = r & 0xff;
      raw[p++] = g & 0xff;
      raw[p++] = b & 0xff;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // color type: truecolor
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/**
 * 生成一张「商品演示图」：居中圆柱瓶体 + 渐变背景
 * 用于本地演示 / 冒烟测试，避免依赖外部素材
 */
function demoProductImage(size = 512) {
  return encodePng(size, size, (x, y) => {
    const cx = size / 2;
    // 背景：温和渐变
    let r = 232 + Math.round(18 * (1 - y / size));
    let g = 236 + Math.round(16 * (1 - y / size));
    let b = 244 + Math.round(10 * (1 - y / size));

    // 瓶身：竖直圆角矩形
    const bodyTop = size * 0.2;
    const bodyBottom = size * 0.82;
    const halfW = size * 0.17;
    if (y >= bodyTop && y <= bodyBottom && Math.abs(x - cx) <= halfW) {
      const t = (x - cx) / halfW; // -1 .. 1
      const shade = 1 - Math.abs(t) * 0.55;
      r = Math.round(96 * shade + 40);
      g = Math.round(124 * shade + 60);
      b = Math.round(232 * shade + 20);
    }
    // 瓶盖
    if (y >= size * 0.12 && y < bodyTop && Math.abs(x - cx) <= size * 0.075) {
      r = 60; g = 74; b = 120;
    }
    // 高光
    if (Math.abs(x - (cx - halfW * 0.45)) < 6 && y > bodyTop && y < bodyBottom) {
      r = Math.min(255, r + 70); g = Math.min(255, g + 70); b = Math.min(255, b + 60);
    }
    // 投影
    if (y > bodyBottom && y < bodyBottom + 18 && Math.abs(x - cx) <= halfW * 1.15) {
      const k = 1 - (y - bodyBottom) / 18;
      r = Math.round(r * (1 - 0.22 * k));
      g = Math.round(g * (1 - 0.22 * k));
      b = Math.round(b * (1 - 0.22 * k));
    }
    return [r, g, b];
  });
}

module.exports = { encodePng, demoProductImage };
