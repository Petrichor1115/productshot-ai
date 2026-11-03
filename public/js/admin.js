/* ==========================================================================
   管理端主控台：左侧导航 + 四视图（URL hash 路由，无刷新切换）
   视图：dashboard / sessions / records / feedback
   ========================================================================== */
(function () {
  'use strict';

  var ROUTES = {
    dashboard: { title: '数据看板', hash: '#/dashboard', loader: loadStats },
    sessions:  { title: '会话记录', hash: '#/sessions',  loader: loadSessions },
    records:   { title: '生图记录', hash: '#/records',   loader: loadRecords },
    feedback:  { title: '用户反馈', hash: '#/feedback',  loader: null },
  };
  var ORDER = ['dashboard', 'sessions', 'records', 'feedback'];

  var state = {
    route: 'dashboard',
    sessionsPage: 1,
    recordsPage: 1,
    pollTimer: null,
  };

  var $ = function (id) { return document.getElementById(id); };
  var el = {
    nav: $('adminNav'),
    topbarTitle: $('topbarTitle'),
    adminName: $('adminName'),
    adminAvatar: $('adminAvatar'),
    brandIcon: $('brandIcon'),
    feedbackIcon: $('feedbackIcon'),
    btnLogout: $('btnLogout'),
    statGrid: $('statGrid'),
    sessionsPanel: $('sessionsPanel'),
    recordsPanel: $('recordsPanel'),
  };

  function renderIcons() {
    document.querySelectorAll('[data-icon]').forEach(function (node) {
      if (node.dataset.rendered === '1') return;
      var raw = node.dataset.icon;
      var size = 18;
      var name = raw;
      var m = raw.match(/^(.*)-(sm|lg)$/);
      if (m) { name = m[1]; size = m[2] === 'sm' ? 14 : 28; }
      node.innerHTML = PSIcons.icon(name, { size: size });
      node.dataset.rendered = '1';
    });
    el.brandIcon.innerHTML = PSIcons.icon('shield', { size: 18 });
    el.feedbackIcon.innerHTML = PSIcons.icon('inbox', { size: 40 });
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---------------- 鉴权 ---------------- */
  function guard() {
    var token = PSStore.getToken();
    if (!token) { location.replace('/admin.html'); return false; }
    return true;
  }

  /* ---------------- 路由 ---------------- */
  function currentHashRoute() {
    var h = (location.hash || '').replace(/^#\/?/, '');
    return ROUTES[h] ? h : null;
  }

  function go(route) {
    if (!ROUTES[route]) route = 'dashboard';
    state.route = route;

    ORDER.forEach(function (r) {
      var view = $('view-' + r);
      if (view) view.classList.toggle('is-active', r === route);
    });

    el.nav.querySelectorAll('.admin-nav__item').forEach(function (n) {
      var on = n.dataset.route === route;
      n.classList.toggle('is-active', on);
      n.setAttribute('aria-current', on ? 'page' : 'false');
    });

    el.topbarTitle.textContent = ROUTES[route].title;
    if (location.hash !== ROUTES[route].hash) {
      history.pushState({ route: route }, '', ROUTES[route].hash);
    }

    stopPolling();
    var loader = ROUTES[route].loader;
    if (loader) loader(route === 'sessions' ? state.sessionsPage : state.recordsPage);
  }

  window.addEventListener('hashchange', function () {
    var r = currentHashRoute();
    go(r || 'dashboard');
  });
  window.addEventListener('popstate', function () {
    go(currentHashRoute() || 'dashboard');
  });

  /* ---------------- 数据看板 ---------------- */
  var STAT_CARDS = [
    { key: 'total_users',   label: '总用户数',       icon: 'users' },
    { key: 'total_sessions',label: '总会话数',       icon: 'messageSquare' },
    { key: 'total_images',  label: '总生成图片数',   icon: 'images' },
    { key: 'today_images',  label: '今日生成图片数', icon: 'calendar' },
  ];

  function loadStats() {
    return PSApi.get('/api/admin/stats')
      .then(function (d) {
        el.statGrid.innerHTML = STAT_CARDS.map(function (c) {
          var v = d && d[c.key] !== undefined && d[c.key] !== null ? d[c.key] : '—';
          return (
            '<div class="stat-card">' +
              '<span class="stat-card__icon">' + PSIcons.icon(c.icon, { size: 22 }) + '</span>' +
              '<div>' +
                '<div class="stat-card__value">' + v + '</div>' +
                '<div class="stat-card__label">' + c.label + '</div>' +
              '</div>' +
            '</div>'
          );
        }).join('');
      })
      .catch(function (err) {
        el.statGrid.innerHTML = STAT_CARDS.map(function (c) {
          return '<div class="stat-card"><span class="stat-card__icon">' + PSIcons.icon(c.icon, { size: 22 }) +
            '</span><div><div class="stat-card__value">—</div><div class="stat-card__label">' + c.label + '</div></div></div>';
        }).join('');
        PSToast(err.message || '统计数据加载失败', 'error');
      });
  }

  /* ---------------- 会话记录 ---------------- */
  function loadSessions(page) {
    state.sessionsPage = page || 1;
    el.sessionsPanel.innerHTML =
      '<div class="table-wrap"><div style="padding:48px;display:flex;justify-content:center"><span class="spinner"></span></div></div>';

    return PSApi.get('/api/admin/sessions', { page: state.sessionsPage })
      .then(function (d) {
        if (!d.list.length) {
          el.sessionsPanel.innerHTML = emptyBlock('暂无数据');
          return;
        }
        el.sessionsPanel.innerHTML =
          '<div class="table-wrap"><table class="table"><thead><tr>' +
            '<th style="width:120px">用户名</th>' +
            '<th style="width:200px">会话名</th>' +
            '<th style="width:150px">创建时间</th>' +
            '<th style="width:90px">图片数</th>' +
            '<th style="width:150px">最近生成时间</th>' +
          '</tr></thead><tbody>' +
          d.list.map(function (r) {
            return '<tr>' +
              '<td>' + escapeHtml(r.username) + '</td>' +
              '<td class="u-truncate" title="' + escapeHtml(r.session_name) + '">' + escapeHtml(r.session_name) + '</td>' +
              '<td class="cell-time">' + escapeHtml(r.created_at || '-') + '</td>' +
              '<td class="cell-num">' + r.image_count + '</td>' +
              '<td class="cell-time">' + escapeHtml(r.last_generated_at || '-') + '</td>' +
            '</tr>';
          }).join('') +
          '</tbody></table></div>' + pagination(d, 'sessions');
        bindPagination(el.sessionsPanel, 'sessions');
      })
      .catch(function (err) {
        el.sessionsPanel.innerHTML = errorBlock(err.message || '加载失败');
        var b = el.sessionsPanel.querySelector('[data-retry]');
        if (b) b.addEventListener('click', function () { loadSessions(state.sessionsPage); });
      });
  }

  /* ---------------- 生图记录 ---------------- */
  var SHOT_TAG = {
    main:    { cls: 'badge--main',  text: '主图' },
    scene:   { cls: 'badge--scene', text: '场景' },
    selling: { cls: 'badge--sell',  text: '卖点' },
  };
  var STATUS_MAP = {
    success: { cls: 'status--success', text: '成功' },
    pending: { cls: 'status--running', text: '进行中' },
    generating: { cls: 'status--running', text: '进行中' },
    failed: { cls: 'status--failed', text: '失败' },
  };

  function loadRecords(page) {
    state.recordsPage = page || 1;
    el.recordsPanel.innerHTML =
      '<div class="table-wrap"><div style="padding:48px;display:flex;justify-content:center"><span class="spinner"></span></div></div>';

    return PSApi.get('/api/admin/records', { page: state.recordsPage })
      .then(function (d) {
        if (!d.list.length) {
          el.recordsPanel.innerHTML = emptyBlock('暂无数据');
          return;
        }
        el.recordsPanel.innerHTML =
          '<div class="table-wrap"><table class="table"><thead><tr>' +
            '<th style="width:120px">用户名</th>' +
            '<th style="width:160px">会话名</th>' +
            '<th style="width:150px">生成时间</th>' +
            '<th style="width:110px">生图类型</th>' +
            '<th style="width:100px">套图类型</th>' +
            '<th style="width:90px">状态</th>' +
            '<th style="width:80px">缩略图</th>' +
          '</tr></thead><tbody>' +
          d.list.map(function (r) {
            var tag = SHOT_TAG[r.shot_type] || { cls: 'badge--gray', text: r.shot_type };
            var st = STATUS_MAP[r.status] || { cls: 'status--running', text: r.status };
            var thumb = r.image_url && r.status === 'success'
              ? '<img class="thumb" src="' + escapeHtml(r.image_url) + '" alt="' + tag.text + '图缩略图" data-zoom="' + escapeHtml(r.image_url) + '" loading="lazy"/>'
              : '<div class="thumb thumb--empty">-</div>';
            return '<tr>' +
              '<td>' + escapeHtml(r.username) + '</td>' +
              '<td class="u-truncate" title="' + escapeHtml(r.session_name) + '">' + escapeHtml(r.session_name) + '</td>' +
              '<td class="cell-time">' + escapeHtml(r.created_at || '-') + '</td>' +
              '<td><span class="badge badge--brand">生成套图</span></td>' +
              '<td><span class="badge ' + tag.cls + '">' + tag.text + '</span></td>' +
              '<td><span class="status ' + st.cls + '"><span class="status__dot"></span>' + st.text + '</span></td>' +
              '<td>' + thumb + '</td>' +
            '</tr>';
          }).join('') +
          '</tbody></table></div>' + pagination(d, 'records');
        bindPagination(el.recordsPanel, 'records');
        bindZoom(el.recordsPanel);

        // 存在「进行中」记录时 5s 轮询刷新（PRD 7.4）
        var running = d.list.some(function (r) { return r.status === 'pending' || r.status === 'generating'; });
        if (running) startPolling();
      })
      .catch(function (err) {
        el.recordsPanel.innerHTML = errorBlock(err.message || '加载失败');
        var b = el.recordsPanel.querySelector('[data-retry]');
        if (b) b.addEventListener('click', function () { loadRecords(state.recordsPage); });
      });
  }

  function startPolling() {
    stopPolling();
    state.pollTimer = setInterval(function () {
      if (state.route !== 'records') { stopPolling(); return; }
      PSApi.get('/api/admin/records', { page: state.recordsPage })
        .then(function (d) { loadRecords(state.recordsPage); })
        .catch(function () { stopPolling(); });
    }, 5000);
  }
  function stopPolling() {
    if (state.pollTimer) { clearInterval(state.pollTimer); state.pollTimer = null; }
  }

  /* ---------------- 缩略图大图预览 ---------------- */
  function bindZoom(root) {
    root.querySelectorAll('[data-zoom]').forEach(function (img) {
      img.addEventListener('click', function () { PSModal.image(img.dataset.zoom, '生成结果大图'); });
      img.addEventListener('error', function () {
        img.replaceWith(Object.assign(document.createElement('div'), {
          className: 'thumb thumb--empty', textContent: '-',
        }));
      });
    });
  }

  /* ---------------- 分页控件 ---------------- */
  function pagination(d, kind) {
    var total = d.totalPages || 1;
    var cur = d.page || 1;
    var pages = [];
    if (total <= 7) {
      for (var i = 1; i <= total; i++) pages.push(i);
    } else {
      pages.push(1);
      if (cur > 3) pages.push('...');
      for (var j = Math.max(2, cur - 1); j <= Math.min(total - 1, cur + 1); j++) pages.push(j);
      if (cur < total - 2) pages.push('...');
      pages.push(total);
    }
    var btns = pages.map(function (p) {
      if (p === '...') return '<span class="pagination__ellipsis">...</span>';
      return '<button class="pagination__btn' + (p === cur ? ' is-active' : '') +
        '" type="button" data-page="' + p + '" data-kind="' + kind + '">' + p + '</button>';
    }).join('');
    return '<div class="pagination">' +
      '<span class="pagination__info">共 ' + d.total + ' 条 · 第 ' + cur + '/' + total + ' 页</span>' +
      '<button class="pagination__btn" type="button" data-page="' + (cur - 1) + '" data-kind="' + kind + '"' +
        (cur <= 1 ? ' disabled' : '') + '>&lt;</button>' +
      btns +
      '<button class="pagination__btn" type="button" data-page="' + (cur + 1) + '" data-kind="' + kind + '"' +
        (cur >= total ? ' disabled' : '') + '>&gt;</button>' +
    '</div>';
  }

  function bindPagination(root, kind) {
    root.querySelectorAll('[data-page][data-kind="' + kind + '"]').forEach(function (b) {
      b.addEventListener('click', function () {
        var p = Number(b.dataset.page);
        if (!p || b.disabled) return;
        if (kind === 'sessions') loadSessions(p); else loadRecords(p);
      });
    });
  }

  function emptyBlock(text) {
    return '<div class="table-wrap"><div class="empty">' +
      '<div class="empty__icon">' + PSIcons.icon('inbox', { size: 24 }) + '</div>' +
      '<div class="empty__title">' + text + '</div></div></div>';
  }
  function errorBlock(msg) {
    return '<div class="error-box" style="margin-bottom:12px"><span>' + escapeHtml(msg) + '</span>' +
      '<button class="btn btn--secondary btn--sm" type="button" data-retry>重试</button></div>';
  }

  /* ---------------- 启动 ---------------- */
  function boot() {
    if (!guard()) return;
    renderIcons();

    PSApi.get('/api/auth/me')
      .then(function (user) {
        if (user.role !== 'admin') {
          PSToast('无管理员权限', 'error');
          PSStore.clear();
          setTimeout(function () { location.replace('/admin.html'); }, 600);
          return;
        }
        el.adminName.textContent = user.nickname || user.username;
        el.adminAvatar.textContent = (user.nickname || user.username).slice(0, 1);

        el.nav.querySelectorAll('.admin-nav__item').forEach(function (n) {
          n.addEventListener('click', function () { go(n.dataset.route); });
        });
        el.btnLogout.addEventListener('click', function () {
          PSStore.clear();
          location.replace('/admin.html');
        });

        var initial = currentHashRoute();
        if (!initial) {
          history.replaceState({ route: 'dashboard' }, '', '#/dashboard');
        }
        go(initial || 'dashboard');
      })
      .catch(function () {
        PSStore.clear();
        location.replace('/admin.html');
      });
  }

  boot();
})();
