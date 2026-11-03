/* ==========================================================================
   统一 API 客户端
   - 自动携带 JWT
   - 统一解析 { code, message, data } 响应体
   - 401 自动清除登录态并跳转登录页
   - 网络异常 / 业务错误统一抛出 ApiError，由页面层转 Toast
   ========================================================================== */
(function (global) {
  'use strict';

  var TOKEN_KEY = 'ps_token';
  var USER_KEY = 'ps_user';

  var store = {
    getToken: function () { return localStorage.getItem(TOKEN_KEY) || ''; },
    setToken: function (t) { localStorage.setItem(TOKEN_KEY, t); },
    getUser: function () {
      try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); } catch (e) { return null; }
    },
    setUser: function (u) { localStorage.setItem(USER_KEY, JSON.stringify(u)); },
    clear: function () { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); },
  };

  function ApiError(message, code, httpStatus, details) {
    this.name = 'ApiError';
    this.message = message || '请求失败';
    this.code = code === undefined ? -1 : code;
    this.httpStatus = httpStatus || 0;
    this.details = details || null;
  }
  ApiError.prototype = Object.create(Error.prototype);
  ApiError.prototype.constructor = ApiError;

  /** 未登录时的统一跳转 */
  function redirectToLogin() {
    var p = location.pathname;
    if (p.indexOf('/admin') >= 0) location.replace('/admin.html');
    else location.replace('/index.html');
  }

  /**
   * 发起请求
   * @param {string} path 以 / 开头
   * @param {object} [opts] { method, body, formData, raw }
   * @returns {Promise<*>} 成功时返回 data 字段
   */
  function request(path, opts) {
    var o = opts || {};
    var headers = {};
    var token = store.getToken();
    if (token) headers.Authorization = 'Bearer ' + token;

    var init = { method: o.method || 'GET', headers: headers, credentials: 'same-origin' };

    if (o.formData) {
      init.body = o.formData; // 交给浏览器自动设置 multipart boundary
    } else if (o.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(o.body);
    }

    return fetch(path, init)
      .then(function (res) {
        var ct = res.headers.get('content-type') || '';
        var isJson = ct.indexOf('application/json') >= 0;
        return (isJson ? res.json() : res.text()).then(function (payload) {
          if (res.status === 401) {
            store.clear();
            redirectToLogin();
            throw new ApiError('登录已过期，请重新登录', 2001, 401);
          }
          if (!res.ok) {
            var msg = (payload && payload.message) || ('请求失败（HTTP ' + res.status + '）');
            throw new ApiError(msg, payload && payload.code, res.status, payload && payload.details);
          }
          if (o.raw) return payload;
          if (payload && typeof payload === 'object' && 'code' in payload) {
            if (payload.code !== 0) throw new ApiError(payload.message || '业务处理失败', payload.code, res.status, payload.data);
            return payload.data;
          }
          return payload;
        });
      })
      .catch(function (err) {
        if (err instanceof ApiError) throw err;
        // fetch 本身失败（断网 / 服务未启动）
        throw new ApiError('网络异常，请检查连接', -1, 0);
      });
  }

  var api = {
    get: function (p, params) {
      var qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return request(p + qs);
    },
    post: function (p, body) { return request(p, { method: 'POST', body: body || {} }); },
    patch: function (p, body) { return request(p, { method: 'PATCH', body: body || {} }); },
    del: function (p) { return request(p, { method: 'DELETE' }); },
    upload: function (p, formData) { return request(p, { method: 'POST', formData: formData }); },
    request: request,
  };

  /* ---------------- Toast ---------------- */
  function toast(message, type) {
    var stack = document.querySelector('.toast-stack');
    if (!stack) {
      stack = document.createElement('div');
      stack.className = 'toast-stack';
      document.body.appendChild(stack);
    }
    var el = document.createElement('div');
    el.className = 'toast toast--' + (type || 'info');
    el.setAttribute('role', 'status');
    el.textContent = message;
    stack.appendChild(el);
    setTimeout(function () {
      el.classList.add('is-leaving');
      setTimeout(function () { el.remove(); }, 180);
    }, 2400);
  }

  /* ---------------- Modal（图片大图预览） ---------------- */
  function openImageModal(src, title) {
    var backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML =
      '<div class="modal" role="dialog" aria-modal="true" aria-label="' + (title || '图片预览') + '">' +
        '<button class="modal__close" type="button" aria-label="关闭预览">' +
          PSIcons.icon('x', { size: 20 }) +
        '</button>' +
        '<div class="modal__body"><img src="' + src + '" alt="' + (title || '生成图片') + '"/></div>' +
      '</div>';
    var close = function () { backdrop.remove(); document.removeEventListener('keydown', onKey); };
    var onKey = function (e) { if (e.key === 'Escape') close(); };
    backdrop.addEventListener('click', function (e) { if (e.target === backdrop) close(); });
    backdrop.querySelector('.modal__close').addEventListener('click', close);
    document.addEventListener('keydown', onKey);
    document.body.appendChild(backdrop);
  }

  global.PSApi = api;
  global.PSStore = store;
  global.PSToast = toast;
  global.PSModal = { image: openImageModal };
  global.PSApiError = ApiError;
})(window);
