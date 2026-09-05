import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const {
  EXPECTED_SOURCE_HASH,
  RoofRiskRepositoryError,
  createRoofRiskRepository,
} = require('../server/roof-risk-repository.js');

const artifact = JSON.parse(
  readFileSync(new URL('../data/roof-risk-dataset.json', import.meta.url), 'utf8'),
);

test('defaults to the severe real-data representative', () => {
  const repo = createRoofRiskRepository(artifact);
  const current = repo.getCurrent();
  assert.equal(current.data_source, 'teacher_real_csv_xgboost');
  assert.equal(current.risk.level, 'red');
  assert.equal(current.model_output.predicted_class, '重大风险');
  assert.equal(current.provenance.source_sha256, EXPECTED_SOURCE_HASH);
  assert.equal(Object.keys(current.metrics).length, 8);
});

test('exposes exactly one selectable event for each risk class', () => {
  const repo = createRoofRiskRepository(artifact);
  const result = repo.listEvents();
  assert.equal(result.events.length, 4);
  assert.deepEqual(
    result.events.map((event) => event.true_class).sort(),
    ['一般风险', '低风险', '较大风险', '重大风险'].sort(),
  );
  assert.equal(result.selected_event_id, 'REAL-SEVERE-001');
});

test('selection changes measurements but closed-loop changes do not', () => {
  const repo = createRoofRiskRepository(artifact);
  repo.selectEvent('REAL-LOW-001');
  const selected = repo.getCurrent();
  const beforeMetrics = structuredClone(selected.metrics);
  const beforeRecordId = selected.model_output.record_id;

  repo.advanceClosedLoop('advance');
  const advanced = repo.getCurrent();
  assert.deepEqual(advanced.metrics, beforeMetrics);
  assert.equal(advanced.model_output.record_id, beforeRecordId);
  assert.ok(advanced.closed_loop.progress > selected.closed_loop.progress);
});

test('history is chronological and belongs to the selected record window', () => {
  const repo = createRoofRiskRepository(artifact);
  const history = repo.getHistory();
  assert.equal(history.points.length, 24);
  const timestamps = history.points.map((point) => point.timestamp);
  assert.deepEqual(timestamps, [...timestamps].sort());
  assert.ok(history.points.some((point) => point.record_id === repo.getCurrent().model_output.record_id));
});

test('explanation reports probabilities, label agreement, and feature evidence', () => {
  const repo = createRoofRiskRepository(artifact);
  const explanation = repo.getExplain();
  assert.equal(explanation.model_output.best_model, 'xgboost');
  assert.equal(Object.keys(explanation.model_output.probabilities).length, 4);
  assert.equal(explanation.model_output.matches_label, true);
  assert.equal(explanation.feature_evidence.length, 3);
  assert.ok(explanation.feature_evidence.every((item) => item.key && item.label));
});

test('rejects unknown events, records, and closed-loop actions', () => {
  const repo = createRoofRiskRepository(artifact);
  for (const action of [
    () => repo.selectEvent('missing'),
    () => repo.evaluateRecord('missing'),
    () => repo.advanceClosedLoop('invalid'),
  ]) {
    assert.throws(action, RoofRiskRepositoryError);
  }
});

test('rejects an artifact with untrusted provenance', () => {
  const invalid = structuredClone(artifact);
  invalid.source.sha256 = '0'.repeat(64);
  assert.throws(
    () => createRoofRiskRepository(invalid),
    /source SHA-256 mismatch/,
  );
});

test('replay metadata exposes all real records and stable risk markers', () => {
  const repo = createRoofRiskRepository(artifact);
  const meta = repo.getReplayMeta();
  assert.equal(meta.total, 20_000);
  assert.equal(meta.feature_schema.length, 8);
  assert.ok(meta.default_index >= 0 && meta.default_index < meta.total);
  assert.deepEqual(meta.event_markers.map((item) => item.risk_level), ['green', 'yellow', 'orange', 'red']);
  assert.ok(meta.event_markers.every((item) => Number.isInteger(item.index) && item.record_id));
});

test('replay frame is bounded, chronological, traceable, and immutable', () => {
  const repo = createRoofRiskRepository(artifact);
  const selectedBefore = repo.getCurrent().event_id;
  const frame = repo.getReplayFrame(1750, 48);
  assert.equal(frame.index, 1750);
  assert.equal(frame.total, 20_000);
  assert.equal(frame.current.provenance.record_id, frame.current.model_output.record_id);
  assert.ok(frame.history.points.length <= 48);
  const times = frame.history.points.map((point) => point.timestamp);
  assert.deepEqual(times, [...times].sort());
  assert.equal(repo.getCurrent().event_id, selectedBefore);
});

test('replay frame rejects invalid indexes and clamps its history window', () => {
  const repo = createRoofRiskRepository(artifact);
  assert.throws(() => repo.getReplayFrame(-1, 48), /REPLAY_INDEX_OUT_OF_RANGE/);
  assert.throws(() => repo.getReplayFrame(20_000, 48), /REPLAY_INDEX_OUT_OF_RANGE/);
  assert.ok(repo.getReplayFrame(500, 10_000).history.points.length <= 120);
});
