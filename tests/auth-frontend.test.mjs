import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

test('login form is labeled, accessible, and does not ask users to choose a role', () => {
  const html = read('login.html');
  const css = read('css/login.css');
  assert.match(html, /id="loginForm"/);
  assert.match(html, /label for="username"/);
  assert.match(html, /autocomplete="username"/);
  assert.match(html, /label for="password"/);
  assert.match(html, /autocomplete="current-password"/);
  assert.match(html, /id="togglePassword"/);
  assert.match(html, /id="loginError"[^>]*role="alert"/);
  assert.doesNotMatch(html, /name="role"|data-role-option|角色选择/);
  assert.match(css, /images\/login-underground\.jpg/);
  assert.match(html, /css\/login\.css/);
  assert.match(html, /js\/login\.js/);
});

test('login script posts credentials and maps actionable error states', () => {
  const script = read('js/login.js');
  assert.match(script, /fetch\(['"]\/api\/auth\/login['"]/);
  assert.match(script, /method:\s*['"]POST['"]/);
  assert.match(script, /JSON\.stringify\(\{ username, password \}\)/);
  assert.match(script, /INVALID_CREDENTIALS/);
  assert.match(script, /RATE_LIMITED/);
  assert.match(script, /\/api\/auth\/session/);
  assert.doesNotMatch(script, /localStorage|sessionStorage/);
});

test('login background is a local non-empty raster asset', () => {
  const imagePath = path.join(ROOT, 'images', 'login-underground.jpg');
  assert.equal(fs.existsSync(imagePath), true);
  assert.ok(fs.statSync(imagePath).size > 50_000);
});

test('application header exposes identity and logout instead of a portal switch', () => {
  const html = read('index.html');
  assert.match(html, /id="authDisplayName"/);
  assert.match(html, /id="authRole"/);
  assert.match(html, /id="logoutButton"/);
  assert.doesNotMatch(html, /id="portalSwitch"|data-portal=/);
});

test('application bootstraps from the session before initializing protected features', () => {
  const script = read('js/main.js');
  assert.match(script, /from ['"]\.\/auth-client\.mjs['"]/);
  assert.match(script, /await bootstrapAuthenticatedPortal\(\)/);
  assert.match(script, /await initApp\(session\.user\)/);
  assert.doesNotMatch(script, /setupPortalSwitch/);
  assert.doesNotMatch(script, /fetch\(['"]\/api\/roof-risk/);
  assert.match(script, /authFetch\(['"]\/api\/roof-risk/);
});

test('auth client owns role URLs, unauthorized redirects, logout, and action visibility', () => {
  const script = read('js/auth-client.mjs');
  assert.match(script, /enterprise/);
  assert.match(script, /regulator/);
  assert.match(script, /expert/);
  assert.match(script, /portal.*role/i);
  assert.match(script, /response\.status === 401/);
  assert.match(script, /\/api\/auth\/logout/);
  assert.match(script, /data-loop-action/);
  assert.doesNotMatch(script, /localStorage|sessionStorage/);
});
