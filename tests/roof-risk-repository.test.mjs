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
