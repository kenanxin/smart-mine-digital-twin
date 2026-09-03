const ROLE_META = {
  enterprise: { label: '企业端', portal: 'enterprise', actions: new Set(['advance', 'reset']) },
  regulator: { label: '监管端', portal: 'regulator', actions: new Set(['advance', 'archive']) },
  expert: { label: '智库端', portal: 'expert', actions: new Set() },
  viewer: { label: '只读用户', portal: 'expert', actions: new Set() },
  super_admin: { label: '超级管理员', portal: 'super_admin', actions: new Set() },
};

function loginRedirect() {
  window.location.replace('/login');
}

export function portalUrlForRole(role, locationLike = window.location) {
  if (role === 'super_admin') return '/admin';
  if (!ROLE_META[role]) return '/login';
  const params = new URLSearchParams(locationLike.search || '');
  params.set('scene', params.get('scene') || 'v2');
  params.set('view', params.get('view') || 'underground');
  params.set('field', params.get('field') || 'risk');
  params.set('portal', ROLE_META[role].portal);
  return `${locationLike.pathname || '/'}?${params.toString()}${locationLike.hash || ''}`;
}

export async function loadSession() {
  const response = await fetch('/api/auth/session', { cache: 'no-store' });
  if (response.status === 401) {
    loginRedirect();
    return null;
  }
  if (!response.ok) throw new Error(`Session request failed with HTTP ${response.status}`);
  const session = await response.json();
  if (!session?.authenticated || !ROLE_META[session?.user?.role]) {
    loginRedirect();
    return null;
  }
  return session;
}

export function applyRolePortal(user) {
  const meta = ROLE_META[user.role];
  if (!meta) return false;
  document.body.classList.remove('portal-enterprise', 'portal-regulator', 'portal-expert');
  document.body.classList.add(`portal-${meta.portal}`);

  const displayName = document.getElementById('authDisplayName');
  const role = document.getElementById('authRole');
  if (displayName) displayName.textContent = user.displayName;
  if (role) role.textContent = meta.label;

  document.querySelectorAll('[data-loop-action]').forEach((button) => {
    const allowed = meta.actions.has(button.dataset.loopAction);
    button.hidden = !allowed;
    button.disabled = !allowed;
  });

  const canonicalUrl = portalUrlForRole(user.role);
  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash || ''}`;
  if (canonicalUrl !== currentUrl) window.history.replaceState({}, '', canonicalUrl);
  return true;
}

export async function authFetch(input, init) {
  const response = await fetch(input, init);
  if (response.status === 401) {
    loginRedirect();
    throw new Error('Authentication required');
  }
  return response;
}

export async function logout() {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } finally {
    loginRedirect();
  }
}

export async function bootstrapAuthenticatedPortal() {
  try {
    const session = await loadSession();
    if (!session) return null;
    if (session.user.role === 'super_admin' && !window.location.pathname.startsWith('/admin')) {
      window.location.replace('/admin');
      return null;
    }
    applyRolePortal(session.user);
    document.getElementById('logoutButton')?.addEventListener('click', logout);
    return session;
  } catch (error) {
    console.error('Unable to verify the current session:', error);
    loginRedirect();
    return null;
  }
}
