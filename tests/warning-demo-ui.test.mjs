import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  canRolePerformDemoAction,
  demoStatusView,
  getWarningDemoAdviceContext,
  validateDisposalDraft,
} from '../js/warning-demo-ui.mjs';
import { createInitialDemoState, reduceDemoState } from '../js/warning-demo-state.mjs';

const now = () => '2026-09-07T10:00:00.000Z';
const enterprise = { role: 'enterprise', displayName: '企业' };
const regulator = { role: 'regulator', displayName: '监管' };
const expert = { role: 'expert', displayName: '专家' };

test('demo actions are restricted to their responsible portal', () => {
  assert.equal(canRolePerformDemoAction('enterprise', 'START_DEMO'), true);
  assert.equal(canRolePerformDemoAction('enterprise', 'APPROVE'), false);
  assert.equal(canRolePerformDemoAction('regulator', 'APPROVE'), true);
  assert.equal(canRolePerformDemoAction('regulator', 'ARCHIVE'), false);
  assert.equal(canRolePerformDemoAction('expert', 'ARCHIVE'), true);
  assert.equal(canRolePerformDemoAction('viewer', 'ARCHIVE'), false);
});

test('status view exposes stable labels and progress for all seven states', () => {
  const expectations = [
    ['ready', '尚未启动', 0],
    ['alert_triggered', '橙色预警已触发', 12],
    ['disposal_in_progress', '企业现场处置中', 30],
    ['pending_review', '等待监管核验', 58],
    ['changes_requested', '监管已驳回，等待整改', 48],
    ['verified', '监管核验通过', 82],
    ['archived', '事件已闭环归档', 100],
  ];
  expectations.forEach(([status, label, progress]) => assert.deepEqual(demoStatusView(status), { label, progress }));
});

test('disposal draft validation preserves explicit evidence requirements', () => {
  assert.equal(validateDisposalDraft({}).code, 'DISPOSAL_INCOMPLETE');
  assert.equal(validateDisposalDraft({
    measures: '加密锚索', workOrder: 'GD-01', responsiblePerson: '张工',
    completedAt: '2026-09-07T10:20', photos: [{ id: 'p1' }],
  }).valid, true);
});

test('submitted enterprise drafts clear after submission and only return for requested changes', () => {
  const script = fs.readFileSync(new URL('../js/warning-demo-ui.mjs', import.meta.url), 'utf8');
  assert.match(script, /if \(editable && state\.disposal\.submissionCount > 0\)/);
  assert.match(script, /else if \(!editable && state\.disposal\.submissionCount > 0\)/);
  assert.match(script, /store\.dispatch\(\{ type: DEMO_ACTIONS\.SUBMIT_DISPOSAL/);
  assert.match(script, /input\.value = '';[\s\S]*?closeDialog\(element\('enterpriseDisposalDrawer'\)\)/);
});

test('expert advice context contains the local demo workflow without replacing model data', () => {
  let state = createInitialDemoState(now);
  state = reduceDemoState(state, { type: 'START_DEMO', actor: enterprise }, { now });
  state = reduceDemoState(state, { type: 'ACKNOWLEDGE', actor: enterprise }, { now });
  state = reduceDemoState(state, {
    type: 'SUBMIT_DISPOSAL', actor: enterprise,
    payload: { measures: '加密锚索', workOrder: 'GD-01', responsiblePerson: '张工', completedAt: '2026-09-07T10:20', photos: [{ id: 'p1' }] },
  }, { now });
  state = reduceDemoState(state, { type: 'APPROVE', actor: regulator, payload: { opinion: '核验通过' } }, { now });
  const context = getWarningDemoAdviceContext({ progress: 68 }, state);
  assert.equal(context.demo_event_id, 'DEMO-ORANGE-001');
  assert.equal(context.demo_status, 'verified');
  assert.equal(context.enterprise_work_order, 'GD-01');
  assert.equal(context.regulator_opinion, '核验通过');
  assert.equal(context.server_closed_loop.progress, 68);
});

test('warning demo controller is isolated from Three.js lifecycle calls', () => {
  const script = fs.readFileSync(new URL('../js/warning-demo-ui.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(script, /initScene|focusRoofWarningStage|switchToUnderground|requestAnimationFrame/);
  assert.match(script, /textContent/);
  assert.match(script, /createWarningDemoStore/);
  assert.match(script, /createWarningDemoMediaStore/);
});
