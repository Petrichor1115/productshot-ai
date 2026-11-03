/* ==========================================================================
   用户端工作台：对话式首页（视图 A） + 套图生成子页面（视图 B）
   单页多态 SPA，视图切换不刷新、不重新鉴权
   ========================================================================== */
(function () {
  'use strict';

  /* ---------------- 常量 ---------------- */
  var MAX_IMAGES = 9;
  var SHOT_META = [
    { key: 'main', label: '产品主图', ratio: '1:1', icon: 'image' },
    { key: 'scene', label: '使用场景', ratio: '1:1', icon: 'home' },
    { key: 'selling', label: '卖点介绍', ratio: '1:1', icon: 'target' },
  ];
  var STYLES = [
    { key: 'minimal', label: '简约白底' },
    { key: 'premium', label: '高级布光' },
    { key: 'natural', label: '自然场景' },
    { key: 'dark', label: '暗调质感' },
  ];
  var MAX_SUPPLEMENT = 500;

  /* ---------------- 运行时状态 ---------------- */
  var state = {
    user: null,
    sessions: [],
    activeId: null,
    view: 'home',
    composerImages: [],
    composerText: '',
    agentOn: true,
    images: [],          // 中列主图（相对路径数组）
    supplement: '',
    shotTypes: ['main', 'scene', 'selling'],
    style: 'minimal',
    results: [],         // generations 明细
    activeResultIdx: 0,
    generating: false,
  };

  /* ---------------- DOM ---------------- */
  var $ = function (id) { return document.getElementById(id); };
  var el = {
    sidebar: $('sidebar'),
    avatar: $('userAvatar'),
    userName: $('userName'),
    userSub: $('userSub'),
    sessionList: $('sessionList'),
    btnNewSession: $('btnNewSession'),
    btnLogout: $('btnLogout'),
    heroMark: $('heroMark'),

    viewHome: $('viewHome'),
    composerThumbs: $('composerThumbs'),
    composerDrop: $('composerDrop'),
    composerInput: $('composerInput'),
    composerFile: $('composerFile'),
    agentSwitch: $('agentSwitch'),
    btnSend: $('btnSend'),
    homeTabs: $('homeTabs'),

    viewShot: $('viewShot'),
    shotDrop: $('shotDrop'),
    shotThumbs: $('shotThumbs'),
    shotFile: $('shotFile'),
    btnResetImages: $('btnResetImages'),
    supplementInput: $('supplementInput'),
    supplementCount: $('supplementCount'),
    shotToggles: $('shotToggles'),
    styleGrid: $('styleGrid'),
    btnGenerate: $('btnGenerate'),

    previewTitle: $('previewTitle'),
    previewSize: $('previewSize'),
    previewStage: $('previewStage'),
    previewPlaceholder: $('previewPlaceholder'),
    btnSwitchPreview: $('btnSwitchPreview'),
    resultStatus: $('resultStatus'),
    btnDownloadAll: $('btnDownloadAll'),
    resultThumbs: $('resultThumbs'),
  };

  /* ---------------- 图标注入 ---------------- */
  function renderIcons(root) {
    (root || document).querySelectorAll('[data-icon]').forEach(function (node) {
      if (node.dataset.rendered === '1') return;
      var raw = node.dataset.icon;
      var size = 18;
      var name = raw;
      var m = raw.match(/^(.*)-(sm|lg)$/);
      if (m) { name = m[1]; size = m[2] === 'sm' ? 14 : 28; }
      node.innerHTML = PSIcons.icon(name, { size: size });
      node.dataset.rendered = '1';
    });
  }

  /* ---------------- 鉴权守卫 ---------------- */
  function guard() {
    if (!PSStore.getToken()) { location.replace('/index.html'); return false; }
    return true;
  }

  /* ---------------- 侧边栏 ---------------- */
  function renderUser(user) {
    state.user = user;
    el.userName.textContent = user.nickname || user.username;
    el.avatar.textContent = (user.nickname || user.username).slice(0, 1);
    el.userSub.textContent = '个人专业版 · 剩余 20 易点';
    el.heroMark.innerHTML = PSIcons.icon('sparkles', { size: 30 });
  }

  function fmtSessionTime(s) {
    if (!s) return '';
    var d = new Date(String(s).replace(/-/g, '/'));
    if (isNaN(d)) return String(s).slice(5, 16);
    var p = function (n) { return n < 10 ? '0' + n : '' + n; };
    return p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  function renderSessions() {
    if (!state.sessions.length) {
      el.sessionList.innerHTML =
        '<div class="empty" style="padding:28px 12px"><div class="empty__desc">还没有会话，<br/>点上方「+ 新增会话」</div></div>';
      return;
    }
    el.sessionList.innerHTML = state.sessions
      .map(function (s) {
        var active = s.id === state.activeId ? ' is-active' : '';
        return (
          '<div class="session-item' + active + '" data-id="' + s.id + '" role="button" tabindex="0" title="' + s.name + '">' +
            '<span class="session-item__name u-truncate">' + escapeHtml(s.name) + '</span>' +
            '<span class="session-item__time">' + fmtSessionTime(s.created_at) + '</span>' +
            '<button class="session-item__del" type="button" data-del="' + s.id + '" aria-label="删除会话 ' + s.name + '">' +
              PSIcons.icon('trash', { size: 13 }) +
            '</button>' +
          '</div>'
        );
      })
      .join('');
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function loadSessions() {
    return PSApi.get('/api/sessions')
      .then(function (list) {
        state.sessions = list || [];
        renderSessions();
      })
      .catch(function (err) {
        el.sessionList.innerHTML =
          '<div class="error-box" style="margin:8px 4px;flex-direction:column;align-items:stretch;gap:8px">' +
            '<span>会话列表加载失败</span>' +
            '<button class="btn btn--secondary btn--sm" type="button" id="retrySessions">重试</button>' +
          '</div>';
        var b = $('retrySessions');
        if (b) b.addEventListener('click', loadSessions);
        PSToast(err.message, 'error');
      });
  }

  /* ---------------- 视图切换 ---------------- */
  function switchView(view) {
    state.view = view;
    var isShot = view === 'shot';
    el.viewHome.classList.toggle('u-hidden', isShot);
    el.viewShot.classList.toggle('u-hidden', !isShot);
    el.sidebar.classList.toggle('is-collapsed', isShot);
    // 浏览器返回：进入套图页时压入历史
    if (isShot && location.hash !== '#/shot') {
      history.pushState({ view: 'shot' }, '', '#/shot');
    } else if (!isShot && location.hash === '#/shot') {
      history.pushState({ view: 'home' }, '', location.pathname);
    }
  }

  window.addEventListener('popstate', function () {
    switchView(location.hash === '#/shot' ? 'shot' : 'home');
  });

  /* ---------------- 会话操作 ---------------- */
  function createSession(name) {
    return PSApi.post('/api/sessions', { name: name }).then(function (s) {
      state.sessions.unshift(s);
      state.activeId = s.id;
      resetShotState();
      renderSessions();
      gotoShotView();
      PSToast('会话已创建', 'success');
      return s;
    });
  }

  function resetShotState() {
    state.images = [];
    state.supplement = '';
    state.shotTypes = ['main', 'scene', 'selling'];
    state.style = 'minimal';
    state.results = [];
    state.activeResultIdx = 0;
    syncShotUI();
  }

  /** 确保存在当前会话（无则自动创建） */
  function ensureSession() {
    if (state.activeId) return Promise.resolve(state.activeId);
    var name = (state.composerText || '').trim().slice(0, 20) || '未命名会话';
    return PSApi.post('/api/sessions', { name: name }).then(function (s) {
      state.sessions.unshift(s);
      state.activeId = s.id;
      renderSessions();
      return s.id;
    });
  }

  function selectSession(id) {
    return PSApi.get('/api/sessions/' + id).then(function (detail) {
      state.activeId = detail.id;
      state.images = detail.original_images || [];
      state.supplement = detail.supplement || '';
      state.shotTypes = (detail.shot_types && detail.shot_types.length) ? detail.shot_types : ['main', 'scene', 'selling'];
      state.style = detail.style || 'minimal';
      state.results = detail.generations || [];
      state.activeResultIdx = 0;
      syncShotUI();
      renderSessions();
      gotoShotView();
    });
  }

  function gotoShotView() {
    switchView('shot');
  }

  /* ---------------- 图片上传 ---------------- */
  function uploadFiles(files, target) {
    var arr = Array.prototype.slice.call(files || []);
    if (!arr.length) return Promise.resolve([]);

    var valid = [];
    for (var i = 0; i < arr.length; i++) {
      var f = arr[i];
      if (!/^image\/(jpeg|png|webp)$/.test(f.type)) {
        PSToast('请上传 JPG / PNG / WEBP 格式的图片', 'error');
        continue;
      }
      if (f.size > 10 * 1024 * 1024) {
        PSToast('图片大小不能超过 10MB', 'error');
        continue;
      }
      valid.push(f);
    }
    if (!valid.length) return Promise.resolve([]);

    var current = target === 'composer' ? state.composerImages : state.images;
    var room = MAX_IMAGES - current.length;
    if (room <= 0) { PSToast('最多上传 ' + MAX_IMAGES + ' 张图片', 'warning'); return Promise.resolve([]); }
    valid = valid.slice(0, room);

    var fd = new FormData();
    valid.forEach(function (f) { fd.append('images', f); });

    return PSApi.upload('/api/upload', fd)
      .then(function (data) {
        var paths = (data.files || []).map(function (f) { return f.path; });
        if (target === 'composer') state.composerImages = state.composerImages.concat(paths);
        else state.images = state.images.concat(paths);
        syncShotUI();
        return paths;
      })
      .catch(function (err) { PSToast(err.message || '上传失败，请检查网络', 'error'); return []; });
  }

  /* ---------------- 中列 UI 同步 ---------------- */
  function syncShotUI() {
    // 主图缩略图
    el.shotThumbs.innerHTML = state.images
      .map(function (p, i) {
        return (
          '<div class="shot-thumb">' +
            '<img src="' + p + '" alt="主图 ' + (i + 1) + '" loading="lazy"/>' +
            '<button class="shot-thumb__del" type="button" data-idx="' + i + '" aria-label="删除主图 ' + (i + 1) + '">' +
              PSIcons.icon('x', { size: 10, strokeWidth: 2.4 }) +
            '</button>' +
          '</div>'
        );
      })
      .join('');
    el.shotDrop.classList.toggle('u-hidden', state.images.length >= MAX_IMAGES);

    // 补充信息
    if (el.supplementInput.value !== state.supplement) el.supplementInput.value = state.supplement;
    el.supplementCount.textContent = String(state.supplement.length);

    // 组图内容开关
    el.shotToggles.innerHTML = SHOT_META.map(function (m) {
      var on = state.shotTypes.indexOf(m.key) >= 0;
      return (
        '<button class="shot-toggle" type="button" data-shot="' + m.key + '" role="checkbox" aria-checked="' + on + '">' +
          '<span class="checkbox' + (on ? ' is-checked' : '') + '"></span>' +
          '<span class="shot-toggle__label">' + m.label + '</span>' +
          '<span class="shot-toggle__ratio">' + m.ratio + '</span>' +
        '</button>'
      );
    }).join('');

    // 风格
    el.styleGrid.innerHTML = STYLES.map(function (s) {
      return '<button class="style-chip' + (state.style === s.key ? ' is-active' : '') +
        '" type="button" data-style="' + s.key + '">' + s.label + '</button>';
    }).join('');

    // 生成按钮可用性（未上传主图禁用）
    el.btnGenerate.disabled = state.images.length === 0 || state.generating;
    el.btnGenerate.textContent = state.generating ? '生成中...' : '立即生成';
    el.btnGenerate.title = state.images.length === 0 ? '请先上传主图' : '';

    renderComposerThumbs();
    renderResults();
  }

  function renderComposerThumbs() {
    el.composerThumbs.innerHTML = state.composerImages
      .map(function (p, i) {
        return (
          '<div class="composer__thumb">' +
            '<img src="' + p + '" alt="已上传图片 ' + (i + 1) + '"/>' +
            '<button class="composer__thumb-del" type="button" data-idx="' + i + '" aria-label="移除图片 ' + (i + 1) + '">' +
              PSIcons.icon('x', { size: 11, strokeWidth: 2.4 }) +
            '</button>' +
          '</div>'
        );
      })
      .join('');
    el.btnSend.disabled = state.composerImages.length === 0;
  }

  /* ---------------- 右列结果渲染 ---------------- */
  function resultOf(shotType) {
    for (var i = 0; i < state.results.length; i++) {
      if (state.results[i].shot_type === shotType) return state.results[i];
    }
    return null;
  }

  function statusText(g) {
    if (!g) return '等待生成';
    if (g.status === 'success') return '已生成';
    if (g.status === 'failed') return '生成失败';
    return '生成中';
  }

  function renderResults() {
    var done = state.results.filter(function (g) { return g.status === 'success'; });
    var totalMs = state.results.reduce(function (s, g) { return s + (g.duration_ms || 0); }, 0);
    el.resultStatus.textContent = done.length
      ? '已生成 ' + done.length + ' 张 · 用时 ' + Math.max(1, Math.round(totalMs / 1000)) + 's'
      : (state.generating ? '正在生成中...' : '尚未生成');
    el.btnDownloadAll.disabled = done.length === 0;

    el.resultThumbs.innerHTML = SHOT_META.filter(function (m) {
      return state.shotTypes.indexOf(m.key) >= 0;
    }).map(function (m, idx) {
      var g = resultOf(m.key);
      var isActive = idx === state.activeResultIdx;
      var inner;
      if (g && g.status === 'success') {
        inner = '<img src="' + g.image_url + '" alt="' + m.label + '" loading="lazy"/>' +
          (isActive ? '<span class="result-card__check">' + PSIcons.icon('check', { size: 12, strokeWidth: 2.6 }) + '</span>' : '');
      } else if (g && g.status === 'failed') {
        inner = '<div class="result-card__state result-card__state--failed">' +
          PSIcons.icon('alert', { size: 20 }) + '<span>生成失败</span></div>';
      } else if (g && (g.status === 'generating' || g.status === 'pending')) {
        inner = '<div class="result-card__state"><span class="spinner"></span><span>生成中</span></div>';
      } else {
        inner = '<div class="result-card__state">' + PSIcons.icon('image', { size: 20 }) + '<span>等待生成</span></div>';
      }
      return (
        '<div class="result-card' + (isActive ? ' is-active' : '') + '" data-idx="' + idx + '" role="button" tabindex="0">' +
          '<div class="result-card__frame">' + inner + '</div>' +
          '<div class="result-card__name">' + m.label + '</div>' +
        '</div>'
      );
    }).join('');

    renderPreview();
  }

  function renderPreview() {
    var list = SHOT_META.filter(function (m) { return state.shotTypes.indexOf(m.key) >= 0; });
    if (!list.length) return;
    var meta = list[Math.min(state.activeResultIdx, list.length - 1)];
    var g = resultOf(meta.key);
    el.previewTitle.textContent = meta.label + ' ' + meta.ratio;

    if (g && g.status === 'success') {
      el.previewPlaceholder.classList.add('u-hidden');
      el.previewSize.textContent = '1024×1024';
      var img = el.previewStage.querySelector('img');
      if (!img) {
        img = document.createElement('img');
        el.previewStage.appendChild(img);
      }
      img.src = g.image_url;
      img.alt = meta.label;
    } else {
      el.previewPlaceholder.classList.remove('u-hidden');
      var img2 = el.previewStage.querySelector('img');
      if (img2) img2.remove();
      el.previewSize.textContent = g && g.status === 'failed' ? '生成失败' : '等待生成';
    }
  }

  /* ---------------- 生成 ---------------- */
  function doGenerate() {
    if (!state.images.length) { PSToast('请先上传商品主图', 'warning'); return; }
    if (!state.shotTypes.length) { PSToast('请至少勾选一个组图类型', 'warning'); return; }

    ensureSession()
      .then(function (sessionId) {
        state.generating = true;
        // 预置「生成中」占位，保证立刻有反馈
        state.results = state.shotTypes.map(function (t) {
          return { shot_type: t, status: 'generating', image_url: null };
        });
        state.activeResultIdx = 0;
        syncShotUI();

        return PSApi.post('/api/generate', {
          session_id: sessionId,
          image_paths: state.images,
          supplement: state.supplement,
          shot_types: state.shotTypes,
          style: state.style,
        });
      })
      .then(function (data) {
        state.results = data.results || [];
        state.generating = false;
        syncShotUI();
        var failed = data.failed_count || 0;
        if (failed > 0) PSToast('生成完成，' + failed + ' 张失败', 'warning');
        else PSToast('已生成 ' + data.success_count + ' 张套图', 'success');
      })
      .catch(function (err) {
        state.generating = false;
        state.results = state.shotTypes.map(function (t) {
          return { shot_type: t, status: 'failed', image_url: null };
        });
        syncShotUI();
        PSToast(err.message || '生成失败，请稍后重试', 'error');
      });
  }

  function downloadAll() {
    var done = state.results.filter(function (g) { return g.status === 'success' && g.image_url; });
    if (!done.length) return;
    done.forEach(function (g, i) {
      setTimeout(function () {
        var a = document.createElement('a');
        a.href = g.image_url;
        a.download = 'productshot-' + g.shot_type + '-' + g.id + (g.image_url.indexOf('.svg') > 0 ? '.svg' : '.png');
        document.body.appendChild(a);
        a.click();
        a.remove();
      }, i * 260);
    });
    PSToast('已开始下载 ' + done.length + ' 张图片', 'success');
  }

  /* ---------------- 事件绑定 ---------------- */
  function bind() {
    // 技能入口（侧边栏 + 底部 Tab）
    document.querySelectorAll('[data-skill]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var key = btn.dataset.skill;
        if (key === 'product_set') {
          document.querySelectorAll('[data-skill="product_set"]').forEach(function (n) { n.classList.add('is-active'); });
          document.querySelectorAll('.skill-item').forEach(function (n) {
            n.classList.toggle('is-active', n.dataset.skill === 'product_set');
          });
          if (state.view !== 'shot') {
            if (!state.activeId) ensureSession().then(gotoShotView);
            else gotoShotView();
          }
          return;
        }
        PSToast('该功能即将上线 ✨', 'warning');
      });
    });

    // 新增会话
    el.btnNewSession.addEventListener('click', function () {
      var name = window.prompt('给这个会话起个名字：', '未命名会话');
      if (name === null) return;
      name = String(name).trim();
      if (!name) { PSToast('会话名称不能为空', 'warning'); return; }
      createSession(name).catch(function (e) { PSToast(e.message, 'error'); });
    });

    // 会话列表：点击切换 / 删除
    el.sessionList.addEventListener('click', function (e) {
      var delBtn = e.target.closest('[data-del]');
      if (delBtn) {
        var delId = Number(delBtn.dataset.del);
        if (!window.confirm('确定删除该会话？')) return;
        PSApi.del('/api/sessions/' + delId)
          .then(function () {
            state.sessions = state.sessions.filter(function (s) { return s.id !== delId; });
            if (state.activeId === delId) { state.activeId = null; resetShotState(); switchView('home'); }
            renderSessions();
            PSToast('会话已删除', 'success');
          })
          .catch(function (err) { PSToast(err.message, 'error'); });
        return;
      }
      var item = e.target.closest('.session-item');
      if (item) selectSession(Number(item.dataset.id)).catch(function (err) { PSToast(err.message, 'error'); });
    });

    // 登出
    el.btnLogout.addEventListener('click', function () {
      PSStore.clear();
      location.replace('/index.html');
    });

    // 首页输入卡上传
    el.composerDrop.addEventListener('click', function () { el.composerFile.click(); });
    el.composerFile.addEventListener('change', function () {
      uploadFiles(el.composerFile.files, 'composer').then(function () { el.composerFile.value = ''; });
    });
    el.composerInput.addEventListener('input', function () { state.composerText = el.composerInput.value; });
    el.composerInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendFromComposer(); }
    });
    el.btnSend.addEventListener('click', sendFromComposer);
    el.agentSwitch.addEventListener('click', function () {
      state.agentOn = !state.agentOn;
      el.agentSwitch.classList.toggle('is-on', state.agentOn);
      el.agentSwitch.setAttribute('aria-checked', String(state.agentOn));
    });

    // 中列上传
    el.shotDrop.addEventListener('click', function () { el.shotFile.click(); });
    el.shotFile.addEventListener('change', function () {
      uploadFiles(el.shotFile.files, 'shot').then(function () { el.shotFile.value = ''; });
    });
    el.shotThumbs.addEventListener('click', function (e) {
      var b = e.target.closest('[data-idx]');
      if (!b) return;
      state.images.splice(Number(b.dataset.idx), 1);
      syncShotUI();
    });
    el.composerThumbs.addEventListener('click', function (e) {
      var b = e.target.closest('[data-idx]');
      if (!b) return;
      state.composerImages.splice(Number(b.dataset.idx), 1);
      syncShotUI();
    });

    // 重选：清空主图
    el.btnResetImages.addEventListener('click', function () {
      if (!state.images.length) return;
      state.images = [];
      syncShotUI();
      PSToast('已清除已上传图片', 'info');
    });

    // 补充信息
    el.supplementInput.addEventListener('input', function () {
      var v = el.supplementInput.value.slice(0, MAX_SUPPLEMENT);
      el.supplementInput.value = v;
      state.supplement = v;
      el.supplementCount.textContent = String(v.length);
    });

    // 组图内容开关
    el.shotToggles.addEventListener('click', function (e) {
      var b = e.target.closest('[data-shot]');
      if (!b) return;
      var key = b.dataset.shot;
      var i = state.shotTypes.indexOf(key);
      if (i >= 0) {
        if (state.shotTypes.length === 1) { PSToast('至少保留一个组图类型', 'warning'); return; }
        state.shotTypes.splice(i, 1);
      } else {
        state.shotTypes.push(key);
      }
      state.shotTypes.sort(function (a, b2) {
        return SHOT_META.map(function (m) { return m.key; }).indexOf(a) -
               SHOT_META.map(function (m) { return m.key; }).indexOf(b2);
      });
      state.activeResultIdx = 0;
      syncShotUI();
    });

    // 风格
    el.styleGrid.addEventListener('click', function (e) {
      var b = e.target.closest('[data-style]');
      if (!b) return;
      state.style = b.dataset.style;
      syncShotUI();
    });

    // 生成 / 下载 / 预览切换
    el.btnGenerate.addEventListener('click', doGenerate);
    el.btnDownloadAll.addEventListener('click', downloadAll);
    el.resultThumbs.addEventListener('click', function (e) {
      var c = e.target.closest('.result-card');
      if (!c) return;
      state.activeResultIdx = Number(c.dataset.idx);
      renderResults();
    });
    el.btnSwitchPreview.addEventListener('click', function () {
      var list = SHOT_META.filter(function (m) { return state.shotTypes.indexOf(m.key) >= 0; });
      if (!list.length) return;
      state.activeResultIdx = (state.activeResultIdx + 1) % list.length;
      renderResults();
    });
  }

  function sendFromComposer() {
    if (!state.composerImages.length) { PSToast('请先上传图片', 'warning'); return; }
    // 首页图片带入套图页中列
    state.images = state.composerImages.slice();
    ensureSession()
      .then(function () {
        syncShotUI();
        gotoShotView();
      })
      .catch(function (e) { PSToast(e.message, 'error'); });
  }

  /* ---------------- 启动 ---------------- */
  function boot() {
    if (!guard()) return;
    renderIcons();
    var cached = PSStore.getUser();
    PSApi.get('/api/auth/me')
      .then(function (user) {
        renderUser(user);
        return loadSessions();
      })
      .then(function () {
        bind();
        syncShotUI();
        if (location.hash === '#/shot') {
          if (state.sessions.length) selectSession(state.sessions[0].id);
          else switchView('shot');
        }
      })
      .catch(function (err) {
        if (cached) renderUser(cached);
        PSToast(err.message || '加载失败', 'error');
        bind();
        syncShotUI();
      });
  }

  boot();
})();
