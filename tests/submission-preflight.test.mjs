import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { inspectCsv, scanTextForSecrets } from '../tools/submission-preflight.mjs';

test('inspectCsv reports data rows, columns, and uppercase SHA-256', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'mine-preflight-'));
  const file = join(dir, 'sample.csv');
  await writeFile(file, 'a,b\n1,2\n3,4\n', 'utf8');
  const result = await inspectCsv(file);
  assert.equal(result.rowCount, 2);
  assert.equal(result.columnCount, 2);
  assert.match(result.sha256, /^[A-F0-9]{64}$/);
});

test('public-text scan accepts placeholders but rejects credential-shaped values', () => {
  assert.deepEqual(scanTextForSecrets('SUPABASE_SERVICE_ROLE_KEY=your-service-role-key'), []);
  assert.ok(scanTextForSecrets('SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiJ9.secret').length > 0);
  assert.ok(scanTextForSecrets('password: A1!productionSecret').length > 0);
});

