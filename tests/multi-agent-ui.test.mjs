import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');
const main = fs.readFileSync(new URL('../js/main.js', import.meta.url), 'utf8');
const ui = fs.readFileSync(new URL('../js/multi-agent-workflow-ui.mjs', import.meta.url), 'utf8');

test('expert portal contains an explicit server-backed six-agent workflow panel', () => {
  ['multiAgentWorkbench', 'runMultiAgentWorkflow', 'multiAgentRail', 'multiAgentDetail', 'multiAgentSource', 'multiAgentBoundary']
    .forEach((id) => assert.match(html, new RegExp(`id="${id}"`)));
  ['A1', 'A2', 'A3', 'A5', 'A4', 'A6'].forEach((id) => assert.match(html, new RegExp(`>${id}<`)));
  assert.match(html, /算法预警 × 多智能体协同研判/);
  assert.match(html, /等待人工确认/);
});

test('workflow UI calls the authenticated server API and exposes failure honestly', () => {
  assert.match(main, /setupMultiAgentWorkflow/);
  assert.match(ui, /\/api\/multi-agent\/run/);
  assert.match(ui, /智能体服务不可用/);
  assert.doesNotMatch(ui, /setInterval\([^)]*success/);
});

test('workflow panel has responsive non-overlapping grid rules', () => {
  assert.match(css, /\.multi-agent-workbench\s*\{/);
  assert.match(css, /\.multi-agent-rail\s*\{/);
  assert.match(css, /@media \(max-width: 980px\)/);
  assert.match(css, /grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/);
});
