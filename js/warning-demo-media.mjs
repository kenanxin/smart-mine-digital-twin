const DB_NAME = 'smart-mine-warning-demo';
const DB_VERSION = 1;
const STORE_NAME = 'evidence';
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_FILES = 4;
const SUPPORTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function result(valid, code = null, message = '') {
  return { valid, code, message };
}

export function validateEvidenceFiles(input) {
  const files = Array.from(input || []);
  if (!files.length) return result(false, 'PHOTO_REQUIRED', '请至少上传一张现场照片');
  if (files.length > MAX_FILES) return result(false, 'TOO_MANY_FILES', `最多上传 ${MAX_FILES} 张现场照片`);
  if (files.some((file) => !SUPPORTED_TYPES.has(String(file?.type || '').toLowerCase()))) {
    return result(false, 'UNSUPPORTED_TYPE', '仅支持 JPEG、PNG 或 WebP 图片');
  }
  if (files.some((file) => !Number.isFinite(Number(file?.size)) || Number(file.size) > MAX_FILE_SIZE)) {
    return result(false, 'FILE_TOO_LARGE', '单张照片不能超过 5 MB');
  }
  return result(true);
}

function mediaError(code, detail = '') {
  const error = new Error(`${code}${detail ? `: ${detail}` : ''}`);
  error.code = code;
  return error;
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || mediaError('MEDIA_STORAGE_FAILED'));
  });
}

function idForFile() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `photo-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createWarningDemoMediaStore(options = {}) {
  const indexedDB = options.indexedDB === undefined ? globalThis.indexedDB : options.indexedDB;
  const now = options.now ?? (() => new Date().toISOString());
  let databasePromise = null;

  function database() {
    if (!indexedDB?.open) return Promise.reject(mediaError('MEDIA_STORAGE_UNAVAILABLE'));
    if (databasePromise) return databasePromise;
    databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('eventId', 'eventId', { unique: false });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || mediaError('MEDIA_STORAGE_FAILED'));
      request.onblocked = () => reject(mediaError('MEDIA_STORAGE_BLOCKED'));
    });
    return databasePromise;
  }

  async function store(mode = 'readonly') {
    const db = await database();
    return db.transaction(STORE_NAME, mode).objectStore(STORE_NAME);
  }

  return {
    async put(eventId, file) {
      const validation = validateEvidenceFiles([file]);
      if (!validation.valid) throw mediaError(validation.code, validation.message);
      const record = {
        id: idForFile(),
        eventId: String(eventId),
        name: String(file.name || '现场照片'),
        type: String(file.type),
        size: Number(file.size),
        createdAt: String(now()),
        blob: file,
      };
      await requestResult((await store('readwrite')).put(record));
      return { id: record.id, name: record.name, type: record.type, size: record.size, createdAt: record.createdAt };
    },

    async list(eventId) {
      const records = await requestResult((await store()).getAll());
      return records.filter((record) => record.eventId === String(eventId));
    },

    async remove(eventId, id) {
      const existing = (await this.list(eventId)).find((record) => record.id === String(id));
      if (existing) await requestResult((await store('readwrite')).delete(String(id)));
    },

    async clear(eventId) {
      const records = await this.list(eventId);
      const objectStore = await store('readwrite');
      await Promise.all(records.map((record) => requestResult(objectStore.delete(record.id))));
    },
  };
}

export function createEvidencePreview(record) {
  if (!record?.blob || !globalThis.URL?.createObjectURL) return null;
  return globalThis.URL.createObjectURL(record.blob);
}

export function revokeEvidencePreviews(urls = []) {
  urls.filter(Boolean).forEach((url) => globalThis.URL?.revokeObjectURL?.(url));
}
