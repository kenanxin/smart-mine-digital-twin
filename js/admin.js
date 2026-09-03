const status = document.getElementById('status');
const usersWrap = document.getElementById('usersWrap');
const logsWrap = document.getElementById('logsWrap');
const resetDialog = document.getElementById('resetDialog');
const resetForm = document.getElementById('resetForm');
const resetPassword = document.getElementById('resetPassword');
const resetTarget = document.getElementById('resetTarget');

const ROLE_LABELS = {
  super_admin: '超级管理员',
  enterprise: '企业端',
  regulator: '监管端',
  expert: '智库端',
  viewer: '只读用户',
};

const AUDIT_LABELS = {
  'user.create': '创建账户',
  'user.update': '更新账户',
  'user.password_reset': '重置密码',
};

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

function setStatus(message, error = false) {
  status.textContent = message || '';
  status.classList.toggle('error', error);
}

async function api(url, options) {
  const response = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
  });
  const body = await response.json().catch(() => ({}));
  if (response.status === 401) {
    window.location.replace('/login');
    throw new Error('登录状态已失效');
  }
  if (!response.ok) throw new Error(body.error?.message || `请求失败 (${response.status})`);
  return body;
}

function roleOptions(selectedRole) {
  return Object.entries(ROLE_LABELS)
    .filter(([key]) => key !== 'super_admin')
    .map(([key, label]) => `<option value="${key}" ${selectedRole === key ? 'selected' : ''}>${label}</option>`)
    .join('');
}

function statusOptions(selectedStatus) {
  return [
    ['active', '启用'],
    ['disabled', '停用'],
    ['locked', '锁定'],
  ].map(([key, label]) => `<option value="${key}" ${selectedStatus === key ? 'selected' : ''}>${label}</option>`).join('');
}

function renderUsers(users) {
  if (!users.length) {
    usersWrap.textContent = '暂无账户';
    return;
  }
  usersWrap.innerHTML = `<table class="admin-table"><thead><tr><th>账户</th><th>角色</th><th>状态</th><th>组织</th><th>操作</th></tr></thead><tbody>${users.map(user => {
    const name = escapeHtml(user.displayName || user.username);
    const username = escapeHtml(user.username);
    const organization = escapeHtml(user.organization || '--');
    const userId = escapeHtml(user.id);
    const roleControl = user.role === 'super_admin'
      ? `<span class="admin-fixed-value"><strong>超级管理员</strong><small>${user.isSelf ? '当前账户，不可修改' : '受保护账户'}</small></span>`
      : `<select aria-label="${name}的角色" data-user-id="${userId}" data-field="role">${roleOptions(user.role)}</select>`;
    const statusControl = user.isSelf
      ? '<span class="admin-fixed-value"><strong>启用</strong><small>当前账户，不可停用</small></span>'
      : `<select aria-label="${name}的状态" data-user-id="${userId}" data-field="status">${statusOptions(user.status)}</select>`;
    return `<tr><td><strong>${name}</strong><br><small>${username}</small></td><td>${roleControl}</td><td>${statusControl}</td><td>${organization}</td><td><div class="row-actions"><button class="admin-btn compact" type="button" data-reset-id="${userId}" data-reset-name="${name}">重置密码</button></div></td></tr>`;
  }).join('')}</tbody></table>`;

  usersWrap.querySelectorAll('select[data-field]').forEach(select => select.addEventListener('change', async event => {
    const control = event.currentTarget;
    try {
      await api(`/api/admin/users/${encodeURIComponent(control.dataset.userId)}`, {
        method: 'PATCH',
        body: JSON.stringify({ [control.dataset.field]: control.value }),
      });
      await refresh();
      setStatus('账户设置已更新');
    } catch (error) {
      await refresh();
      setStatus(error.message, true);
    }
  }));

  usersWrap.querySelectorAll('[data-reset-id]').forEach(button => button.addEventListener('click', event => {
    const control = event.currentTarget;
    resetForm.dataset.userId = control.dataset.resetId;
    resetTarget.textContent = control.dataset.resetName;
    resetPassword.value = '';
    resetDialog.showModal();
    resetPassword.focus();
  }));
}

function renderAuditLogs(logs) {
  logsWrap.innerHTML = logs.slice(0, 20).map(log => {
    const action = escapeHtml(AUDIT_LABELS[log.action] || log.action);
    const target = escapeHtml(log.target_id || '');
    const time = escapeHtml(new Date(log.created_at).toLocaleString('zh-CN'));
    return `<p class="audit-item"><strong>${action}</strong>${target ? ` · ${target}` : ''}<br><small>${time}</small></p>`;
  }).join('') || '暂无日志';
}

async function refresh() {
  try {
    const [users, logs] = await Promise.all([
      api('/api/admin/users'),
      api('/api/admin/audit-logs'),
    ]);
    renderUsers(users.users || []);
    renderAuditLogs(logs.logs || []);
    setStatus('已同步');
  } catch (error) {
    setStatus(error.message, true);
  }
}

document.getElementById('createForm').addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form));
  try {
    await api('/api/admin/users', { method: 'POST', body: JSON.stringify(data) });
    form.reset();
    await refresh();
    setStatus('账户创建成功');
  } catch (error) {
    setStatus(error.message, true);
  }
});

resetForm.addEventListener('submit', async event => {
  event.preventDefault();
  try {
    await api(`/api/admin/users/${encodeURIComponent(resetForm.dataset.userId)}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ password: resetPassword.value }),
    });
    resetDialog.close();
    resetPassword.value = '';
    await refresh();
    setStatus('密码已重置');
  } catch (error) {
    setStatus(error.message, true);
  }
});

document.getElementById('cancelReset').addEventListener('click', () => resetDialog.close());
document.getElementById('refreshBtn').addEventListener('click', refresh);
document.getElementById('logoutBtn').addEventListener('click', async () => {
  await fetch('/api/auth/logout', { method: 'POST' });
  window.location.replace('/login');
});

refresh();
