/* ==========================================================================
   登录 / 注册页逻辑（用户端 index.html 与 管理端 admin.html 复用）
   页面通过 <body data-app="user|admin"> 区分形态
   ========================================================================== */
(function () {
  'use strict';

  var body = document.body;
  var isAdmin = body.dataset.app === 'admin';

  var el = {
    logo: document.getElementById('authLogo'),
    title: document.getElementById('authTitle'),
    subtitle: document.getElementById('authSubtitle'),
    username: document.getElementById('username'),
    password: document.getElementById('password'),
    usernameError: document.getElementById('usernameError'),
    passwordError: document.getElementById('passwordError'),
    formError: document.getElementById('formError'),
    submit: document.getElementById('submitBtn'),
    toggleText: document.getElementById('toggleText'),
    toggleLink: document.getElementById('toggleLink'),
    adminLink: document.getElementById('adminLink'),
  };

  var mode = 'login'; // login | register（仅用户端可切换）

  /* ---------- 渲染：图标与文案 ---------- */
  function renderShell() {
    if (isAdmin) {
      el.logo.innerHTML = PSIcons.icon('shield', { size: 26 });
      el.title.textContent = '管理后台';
      el.subtitle.textContent = 'ProductShot Admin';
      el.username.placeholder = '请输入管理员账号';
      if (el.toggleText) el.toggleText.textContent = '← 返回用户端登录';
      if (el.toggleLink) {
        el.toggleLink.style.display = 'none';
      }
      if (el.adminLink) el.adminLink.href = '/index.html';
    } else {
      el.logo.innerHTML = PSIcons.icon('sparkles', { size: 26 });
      el.title.textContent = 'ProductShot';
      el.subtitle.textContent = 'AI 商品套图生成器';
      if (el.adminLink) el.adminLink.href = '/admin.html';
    }
  }

  function renderMode() {
    if (isAdmin) return;
    var registering = mode === 'register';
    el.submit.textContent = registering ? '注 册' : '登 录';
    el.toggleText.innerHTML = registering
      ? '已有账号？<a id="toggleLink" class="auth-card__link">立即登录</a>'
      : '没有账号？<a id="toggleLink" class="auth-card__link">立即注册</a>';
    var link = document.getElementById('toggleLink');
    if (link) link.addEventListener('click', function () {
      mode = mode === 'login' ? 'register' : 'login';
      clearErrors();
      renderMode();
    });
  }

  /* ---------- 错误展示（贴近字段，而非仅顶部） ---------- */
  function clearErrors() {
    [el.usernameError, el.passwordError, el.formError].forEach(function (n) {
      if (n) { n.textContent = ''; n.classList.remove('is-error'); }
    });
    if (el.username) el.username.classList.remove('is-error');
    if (el.password) el.password.classList.remove('is-error');
  }

  function showFieldError(inputNode, errorNode, msg) {
    if (errorNode) errorNode.textContent = msg;
    if (inputNode) inputNode.classList.add('is-error');
  }

  function showFormError(msg) {
    if (el.formError) el.formError.textContent = msg;
  }

  /* ---------- 前端校验（PRD 第 6 节） ---------- */
  function validate() {
    clearErrors();
    var username = (el.username.value || '').trim();
    var password = el.password.value || '';
    var okFlag = true;

    if (!username) {
      showFieldError(el.username, el.usernameError, isAdmin ? '请输入管理员账号' : '请输入用户名（3-20 字符）');
      okFlag = false;
    } else if (!isAdmin && (username.length < 3 || username.length > 20)) {
      showFieldError(el.username, el.usernameError, '请输入用户名（3-20 字符）');
      okFlag = false;
    }

    if (!password) {
      showFieldError(el.password, el.passwordError, '请输入密码');
      okFlag = false;
    } else if (password.length < 6) {
      showFieldError(el.password, el.passwordError, '密码至少 6 位');
      okFlag = false;
    }
    return okFlag;
  }

  /* ---------- 提交 ---------- */
  function setLoading(loading) {
    el.submit.disabled = loading;
    el.submit.innerHTML = loading
      ? '<span class="spinner spinner--light"></span>' + (mode === 'register' ? '注册中...' : '登录中...')
      : (mode === 'register' ? '注 册' : '登 录');
  }

  function onSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    var username = el.username.value.trim();
    var password = el.password.value;
    setLoading(true);

    var payload = { username: username, password: password };
    if (isAdmin) payload.role = 'admin';

    var done = function (data) {
      PSStore.setToken(data.token);
      PSStore.setUser(data.user);
      PSToast('登录成功，正在进入...', 'success');
      setTimeout(function () {
        location.href = isAdmin ? '/admin-dashboard.html' : '/workspace.html';
      }, 320);
    };

    var fail = function (err) {
      setLoading(false);
      showFormError(err.message || '操作失败，请稍后重试');
    };

    if (mode === 'register') {
      PSApi.post('/api/auth/register', payload).then(done).catch(fail);
    } else {
      PSApi.post('/api/auth/login', payload).then(done).catch(fail);
    }
  }

  /* ---------- 已登录则直达目标页 ---------- */
  (function bootstrap() {
    if (!PSStore.getToken()) { renderShell(); renderMode(); return; }
    PSApi.get('/api/auth/me')
      .then(function (user) {
        PSStore.setUser(user);
        if (isAdmin && user.role !== 'admin') {
          PSToast('无管理员权限', 'error');
          PSStore.clear();
          renderShell(); renderMode();
          return;
        }
        location.replace(isAdmin ? '/admin-dashboard.html' : '/workspace.html');
      })
      .catch(function () {
        PSStore.clear();
        renderShell(); renderMode();
      });
  })();

  el.submit.addEventListener('click', onSubmit);
  [el.username, el.password].forEach(function (n) {
    n.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') onSubmit(e);
    });
    n.addEventListener('input', clearErrors);
  });
})();
