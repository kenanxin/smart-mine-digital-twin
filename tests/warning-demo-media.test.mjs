import assert from 'node:assert/strict';
import test from 'node:test';

import { createWarningDemoMediaStore, validateEvidenceFiles } from '../js/warning-demo-media.mjs';

test('accepts one to four supported image files within five megabytes', () => {
  const files = [
    { name: 'a.jpg', type: 'image/jpeg', size: 1024 },
    { name: 'b.png', type: 'image/png', size: 2048 },
    { name: 'c.webp', type: 'image/webp', size: 4096 },
  ];
  assert.deepEqual(validateEvidenceFiles(files), { valid: true, code: null, message: '' });
});

test('rejects missing, excessive, unsupported, and oversized evidence', () => {
  assert.equal(validateEvidenceFiles([]).code, 'PHOTO_REQUIRED');
  assert.equal(validateEvidenceFiles(Array.from({ length: 5 }, () => ({ type: 'image/jpeg', size: 1 }))).code, 'TOO_MANY_FILES');
  assert.equal(validateEvidenceFiles([{ type: 'application/pdf', size: 1 }]).code, 'UNSUPPORTED_TYPE');
  assert.equal(validateEvidenceFiles([{ type: 'image/png', size: (5 * 1024 * 1024) + 1 }]).code, 'FILE_TOO_LARGE');
});

test('media store reports IndexedDB unavailability explicitly', async () => {
  const store = createWarningDemoMediaStore({ indexedDB: null });
  await assert.rejects(() => store.list('DEMO-ORANGE-001'), /MEDIA_STORAGE_UNAVAILABLE/);
  await assert.rejects(() => store.clear('DEMO-ORANGE-001'), /MEDIA_STORAGE_UNAVAILABLE/);
});
