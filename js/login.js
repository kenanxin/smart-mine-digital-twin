'use strict';

const form = document.getElementById('loginForm');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const togglePassword = document.getElementById('togglePassword');
const submitButton = document.getElementById('loginSubmit');
const errorElement = document.getElementById('loginError');

function setError(message = '') { errorElement.textContent = message; }

function setSubmitting(isSubmitting) {
  submitButton.disabled = isSubmitting;
  submitButton.querySelector('span').textContent = isSubmitting ? '正在验证' : '进入系统';
  form.setAttribute('aria-busy', String(isSubmitting));
}

function loginErrorMessage(code, retryAfter) {
  if (code === 'INVALID_CREDENTIALS') return '账号或密码不正确，请重新输入。';
  if (code === 'RATE_LIMITED') {
    const minutes = Math.max(1, Math.ceil((Number(retryAfter) || 900) / 60));
    return `登录尝试过多，请在 ${minutes} 分钟后重试。`;
  }
  if (code === 'INVALID_JSON') return '登录信息格式不正确，请重新输入。';
  return '身份认证服务暂不可用，请稍后重试。';
}

function redirectToPortal(payload) {
  const role = payload?.user?.role;
  const allowed = new Set(['enterprise', 'regulator', 'expert', 'super_admin']);
  if (!allowed.has(role)) {
    setError('账号角色配置无效，请联系系统管理员。');
    return;
  }
  window.location.replace(payload.portalUrl || `/?scene=v2&view=underground&field=risk&portal=${role}`);
}

togglePassword.addEventListener('click', () => {
  const show = passwordInput.type === 'password';
  passwordInput.type = show ? 'text' : 'password';
  togglePassword.setAttribute('aria-pressed', String(show));
  togglePassword.setAttribute('aria-label', show ? '隐藏密码' : '显示密码');
  togglePassword.title = show ? '隐藏密码' : '显示密码';
  passwordInput.focus();
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  setError();
  const username = usernameInput.value.trim();
  const password = passwordInput.value;
  if (!username || !password) {
    setError('请输入账号和密码。');
    (!username ? usernameInput : passwordInput).focus();
    return;
  }

  setSubmitting(true);
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(loginErrorMessage(payload?.error?.code, response.headers.get('retry-after')));
      return;
    }
    redirectToPortal(payload);
  } catch (error) {
    setError('无法连接身份认证服务，请检查网络后重试。');
  } finally {
    setSubmitting(false);
  }
});

async function redirectExistingSession() {
  try {
    const response = await fetch('/api/auth/session', { cache: 'no-store' });
    if (!response.ok) return;
    redirectToPortal(await response.json());
  } catch (error) {
    // The form remains usable when the optional session check is unavailable.
  }
}

redirectExistingSession();
