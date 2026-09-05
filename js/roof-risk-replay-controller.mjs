const SUPPORTED_SPEEDS = new Set([1, 2, 5]);

export function createReplayController({
  total,
  initialIndex = 0,
  loadFrame,
  onFrame = () => {},
  onState = () => {},
  intervalMs = 900,
}) {
  if (!Number.isInteger(total) || total < 1) throw new Error('Replay total must be a positive integer');
  if (!Number.isInteger(initialIndex) || initialIndex < 0 || initialIndex >= total) {
    throw new Error('Initial replay index is out of range');
  }
  if (typeof loadFrame !== 'function') throw new Error('Replay loadFrame must be a function');

  let state = { status: 'idle', index: initialIndex, speed: 1, loop: false, error: null };
  let timer = null;
  let inFlight = null;
  let disposed = false;

  const emit = () => onState({ ...state });
  const clearTimer = () => {
    if (timer) clearInterval(timer);
    timer = null;
  };

  async function applyIndex(nextIndex, statusAfter = 'paused') {
    if (disposed || inFlight) return false;
    inFlight = Promise.resolve(loadFrame(nextIndex));
    try {
      const frame = await inFlight;
      if (disposed) return false;
      state = { ...state, index: nextIndex, status: statusAfter, error: null };
      onFrame(frame);
      emit();
      return true;
    } catch (error) {
      clearTimer();
      state = { ...state, status: 'error', error: error?.message || '回放数据加载失败' };
      emit();
      return false;
    } finally {
      inFlight = null;
    }
  }

  async function tick() {
    if (state.status !== 'playing' || inFlight) return;
    const candidate = state.index + state.speed;
    if (candidate >= total) {
      if (!state.loop) {
        clearTimer();
        if (state.index !== total - 1) await applyIndex(total - 1, 'ended');
        else {
          state = { ...state, status: 'ended' };
          emit();
        }
        return;
      }
      await applyIndex(candidate % total, 'playing');
      return;
    }
    if (!state.loop && candidate === total - 1) {
      clearTimer();
      await applyIndex(candidate, 'ended');
      return;
    }
    await applyIndex(candidate, 'playing');
  }

  function pause() {
    clearTimer();
    if (state.status !== 'error' && state.status !== 'ended') state = { ...state, status: 'paused' };
    emit();
  }

  return {
    snapshot: () => ({ ...state }),
    play() {
      if (disposed) return;
      clearTimer();
      state = { ...state, status: 'playing', error: null };
      emit();
      timer = setInterval(tick, intervalMs);
    },
    pause,
    async seek(index) {
      if (!Number.isInteger(index) || index < 0 || index >= total) throw new Error('Replay index is out of range');
      pause();
      return applyIndex(index, 'paused');
    },
    async previous() {
      pause();
      return applyIndex(Math.max(0, state.index - 1), 'paused');
    },
    async next() {
      pause();
      return applyIndex(Math.min(total - 1, state.index + 1), 'paused');
    },
    setSpeed(speed) {
      if (!SUPPORTED_SPEEDS.has(speed)) throw new Error(`Unsupported replay speed: ${speed}`);
      state = { ...state, speed };
      emit();
    },
    setLoop(enabled) {
      state = { ...state, loop: Boolean(enabled) };
      emit();
    },
    dispose() {
      disposed = true;
      clearTimer();
    },
  };
}
