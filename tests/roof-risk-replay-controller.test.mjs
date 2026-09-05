import assert from 'node:assert/strict';
import test from 'node:test';

import { createReplayController } from '../js/roof-risk-replay-controller.mjs';

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

test('replay controller seeks real frame indexes and pauses on manual navigation', async () => {
  const applied = [];
  const controller = createReplayController({
    total: 4,
    initialIndex: 1,
    intervalMs: 10,
    loadFrame: async (index) => ({ index }),
    onFrame: (frame) => applied.push(frame.index),
  });
  await controller.seek(3);
  assert.deepEqual(applied, [3]);
  assert.equal(controller.snapshot().index, 3);
  assert.equal(controller.snapshot().status, 'paused');
  controller.dispose();
});

test('replay controller accepts exact speeds and stops at the final record', async () => {
  const controller = createReplayController({
    total: 6,
    initialIndex: 0,
    intervalMs: 5,
    loadFrame: async (index) => ({ index }),
    onFrame: () => {},
  });
  controller.setSpeed(5);
  controller.play();
  await wait(24);
  assert.equal(controller.snapshot().index, 5);
  assert.equal(controller.snapshot().status, 'ended');
  assert.throws(() => controller.setSpeed(3), /Unsupported replay speed/);
  controller.dispose();
});

test('replay controller wraps only when looping and exposes load errors', async () => {
  const controller = createReplayController({
    total: 2,
    initialIndex: 1,
    intervalMs: 5,
    loadFrame: async (index) => {
      if (index === 0) throw new Error('network unavailable');
      return { index };
    },
    onFrame: () => {},
  });
  controller.setLoop(true);
  controller.play();
  await wait(15);
  assert.equal(controller.snapshot().status, 'error');
  assert.match(controller.snapshot().error, /network unavailable/);
  controller.dispose();
});
