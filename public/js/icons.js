/* ==========================================================================
   内联 SVG 图标库（Lucide 风格：24 网格 / 1.8 描边 / 圆角端点）
   设计约束（ui-ux-pro-max）：不使用 emoji 作为功能图标，保证跨端一致与专业观感
   ========================================================================== */
(function (global) {
  'use strict';

  var PATHS = {
    sparkles: '<path d="M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9z"/><path d="M18.4 15.2l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    grid: '<rect x="3" y="3" width="7.5" height="7.5" rx="1.6"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.6"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.6"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.6"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2.4"/><circle cx="8.6" cy="8.6" r="1.6"/><path d="M21 15.5l-4.8-4.8L5 21"/>',
    wand: '<path d="M5 20l9.5-9.5"/><path d="M14.5 5.5l4 4"/><path d="M19.5 2.5l2 2"/><path d="M11.5 8.5l2 2"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2.2"/><path d="M5.5 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v.5"/>',
    palette: '<path d="M12 2a10 10 0 0 0 0 20c1.1 0 2-.9 2-2 0-.6-.3-1.1-.7-1.5-.4-.4-.6-.8-.6-1.2 0-.7.6-1.3 1.3-1.3h2.7A5.3 5.3 0 0 0 22 11.3C22 6.1 17.5 2 12 2z"/><circle cx="8" cy="8.5" r="1.2"/><circle cx="12.5" cy="6.5" r="1.2"/><circle cx="17" cy="10" r="1.2"/>',
    scissors: '<circle cx="6" cy="6" r="2.8"/><circle cx="6" cy="18" r="2.8"/><path d="M20 4L8.6 15.4"/><path d="M14.6 14.6L20 20"/><path d="M8.6 8.6L12 12"/>',
    plus: '<path d="M12 5.5v13M5.5 12h13"/>',
    trash: '<path d="M3.5 6h17"/><path d="M8.5 6V4.6A1.6 1.6 0 0 1 10.1 3h3.8a1.6 1.6 0 0 1 1.6 1.6V6"/><path d="M18.5 6l-1 13.2a2 2 0 0 1-2 1.8H8.5a2 2 0 0 1-2-1.8L5.5 6"/>',
    logout: '<path d="M9.5 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4.5"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9.5"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5"/><path d="M12 3v12"/>',
    arrowUp: '<path d="M12 19.5V4.8"/><path d="M5.5 11.3L12 4.8l6.5 6.5"/>',
    check: '<path d="M20 6.5L9 17.5l-5-5"/>',
    x: '<path d="M18 6L6 18M6 6l12 12"/>',
    chevronLeft: '<path d="M15 18.5l-6.5-6.5L15 5.5"/>',
    chevronRight: '<path d="M9 5.5l6.5 6.5L9 18.5"/>',
    messageSquare: '<path d="M21 14.5a2 2 0 0 1-2 2H7.5L3 21V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    images: '<rect x="3" y="3" width="14" height="14" rx="2.2"/><path d="M21 7.5v11a2 2 0 0 1-2 2H7"/><circle cx="8" cy="8" r="1.4"/>',
    mail: '<rect x="2.5" y="4.5" width="19" height="15" rx="2.2"/><path d="M3 7.5l9 5.5 9-5.5"/>',
    users: '<path d="M16.5 20.5v-1.8a3.6 3.6 0 0 0-3.6-3.6H6.1A3.6 3.6 0 0 0 2.5 18.7v1.8"/><circle cx="9.5" cy="7.5" r="3.5"/><path d="M21.5 20.5v-1.8a3.6 3.6 0 0 0-2.7-3.5"/><path d="M16 4.2a3.6 3.6 0 0 1 0 6.9"/>',
    calendar: '<rect x="3" y="4.5" width="18" height="17" rx="2.2"/><path d="M3 10h18M8 2.5v4M16 2.5v4"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7.5 10.5l4.5 4.5 4.5-4.5"/><path d="M12 15V3.5"/>',
    alert: '<circle cx="12" cy="12" r="9.2"/><path d="M12 7.5v5"/><path d="M12 16.2h.01"/>',
    refresh: '<path d="M20.5 12a8.5 8.5 0 1 1-2.9-6.4"/><path d="M20.5 3.5v5h-5"/>',
    clock: '<circle cx="12" cy="12" r="9.2"/><path d="M12 6.5v6l3.8 2"/>',
    inbox: '<path d="M21.5 12.5h-5.8l-1.8 2.8h-3.8l-1.8-2.8H2.5"/><path d="M5.6 5.2L2.5 12v6.2a2 2 0 0 0 2 2h15a2 2 0 0 0 2-2V12l-3.1-6.8a2 2 0 0 0-1.8-1.2H7.4a2 2 0 0 0-1.8 1.2z"/>',
    camera: '<path d="M22.5 18.5a2 2 0 0 1-2 2h-17a2 2 0 0 1-2-2V8.5a2 2 0 0 1 2-2h3.5l1.8-2.8h6.4l1.8 2.8h3.5a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="3.6"/>',
    target: '<circle cx="12" cy="12" r="9.2"/><circle cx="12" cy="12" r="5.2"/><circle cx="12" cy="12" r="1.6"/>',
    home: '<path d="M3 10.2L12 3l9 7.2v9.3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9.5 21.5v-9h5v9"/>',
    layers: '<path d="M12 2.5l9 4.8-9 4.8-9-4.8z"/><path d="M3 12.2l9 4.8 9-4.8"/><path d="M3 16.8l9 4.8 9-4.8"/>',
    lock: '<rect x="3.5" y="10.5" width="17" height="11" rx="2.2"/><path d="M7.5 10.5V7a4.5 4.5 0 0 1 9 0v3.5"/>',
    user: '<circle cx="12" cy="8" r="3.8"/><path d="M4.5 21v-.8a5.5 5.5 0 0 1 5.5-5.5h4a5.5 5.5 0 0 1 5.5 5.5v.8"/>',
    eye: '<path d="M2 12s3.6-6.8 10-6.8S22 12 22 12s-3.6 6.8-10 6.8S2 12 2 12z"/><circle cx="12" cy="12" r="2.8"/>',
    spark: '<path d="M13 2L4.5 13.5H11l-1 8.5 8.5-11.5H12z"/>',
  };

  /** 填充式图标（不使用描边） */
  var FILLED = { sparkles: true, spark: true };

  /**
   * 生成图标 HTML 字符串
   * @param {string} name 图标名
   * @param {object} [opts] { size, className, strokeWidth, title }
   */
  function icon(name, opts) {
    var o = opts || {};
    var size = o.size || 20;
    var sw = o.strokeWidth || 1.8;
    var body = PATHS[name] || '';
    var filled = FILLED[name];
    var attrs =
      'xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '" viewBox="0 0 24 24"' +
      ' fill="' + (filled ? 'currentColor' : 'none') + '"' +
      ' stroke="' + (filled ? 'none' : 'currentColor') + '"' +
      ' stroke-width="' + sw + '" stroke-linecap="round" stroke-linejoin="round"' +
      ' class="' + (o.className || '') + '" aria-hidden="true" focusable="false"' +
      (filled && name === 'sparkles' ? ' stroke-linecap="round"' : '');
    if (o.title) attrs += ' role="img" aria-label="' + o.title + '"';
    return '<svg ' + attrs + '>' + body + '</svg>';
  }

  global.PSIcons = { icon: icon, has: function (n) { return !!PATHS[n]; } };
})(window);
