import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { assertAdminUserUpdateAllowed, createAppServer } = require('../server.js');

const operator = { subject: 'admin-1', role: 'super_admin' };

test('super administrator cannot demote or disable the current account', () => {
  assert.throws(
    () => assertAdminUserUpdateAllowed(operator, 'admin-1', { role: 'enterprise' }),
    error => error.code === 'ADMIN_SELF_PROTECTED' && error.statusCode === 409,
  );
  assert.throws(
    () => assertAdminUserUpdateAllowed(operator, 'admin-1', { status: 'disabled' }),
    error => error.code === 'ADMIN_SELF_PROTECTED' && error.statusCode === 409,
  );
});

test('unchanged self state and ordinary-account updates remain allowed', () => {
  assert.doesNotThrow(() => assertAdminUserUpdateAllowed(operator, 'admin-1', {
    role: 'super_admin',
    status: 'active',
  }));
  assert.doesNotThrow(() => assertAdminUserUpdateAllowed(operator, 'user-2', {
    role: 'enterprise',
    status: 'disabled',
  }));
});

test('admin API marks the current account and rejects self-demotion before mutation', async () => {
  let updateCalls = 0;
  const authService = {
    async getSession() { return { user: operator, expiresAt: Date.now() + 60_000 }; },
    can(role, action) { return role === 'super_admin' && ['users.manage', 'audit.read'].includes(action); },
    async listUsers() {
      return [
        { id: 'admin-1', username: 'admin@example.com', role: 'super_admin', status: 'active' },
        { id: 'user-2', username: 'user@example.com', role: 'viewer', status: 'active' },
      ];
    },
    async updateUser() { updateCalls += 1; return {}; },
  };
  const server = createAppServer({ authService });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  try {
    const usersResponse = await fetch(`${baseUrl}/api/admin/users`);
    const users = (await usersResponse.json()).users;
    assert.equal(users[0].isSelf, true);
    assert.equal(users[1].isSelf, false);

    const updateResponse = await fetch(`${baseUrl}/api/admin/users/admin-1`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'enterprise' }),
    });
    assert.equal(updateResponse.status, 409);
    assert.equal((await updateResponse.json()).error.code, 'ADMIN_SELF_PROTECTED');
    assert.equal(updateCalls, 0);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
