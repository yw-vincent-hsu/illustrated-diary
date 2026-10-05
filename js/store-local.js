// IndexedDB 版資料層（階段 1～2）。欄位名稱與正式的 Supabase 資料表一致。
const DB_NAME = 'illustrated-diary';
const DB_VERSION = 1;

let dbPromise;
function db() {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const d = req.result;
      const entries = d.createObjectStore('entries', { keyPath: 'id' });
      entries.createIndex('entry_date', 'entry_date');
      d.createObjectStore('images');   // key = path，value = Blob
      d.createObjectStore('settings'); // key = 'app'
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function run(store, mode, fn) {
  const d = await db();
  return new Promise((resolve, reject) => {
    const tx = d.transaction(store, mode);
    const req = fn(tx.objectStore(store));
    tx.oncomplete = () => resolve(req?.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

const byCreated = (a, b) => a.created_at.localeCompare(b.created_at);

export async function listEntriesByMonth(year, month) {
  const mm = String(month).padStart(2, '0');
  const range = IDBKeyRange.bound(`${year}-${mm}-01`, `${year}-${mm}-31`);
  const list = await run('entries', 'readonly', (s) => s.index('entry_date').getAll(range));
  return list.sort((a, b) => a.entry_date.localeCompare(b.entry_date) || byCreated(a, b));
}

export async function getEntriesByDate(date) {
  const list = await run('entries', 'readonly', (s) => s.index('entry_date').getAll(date));
  return list.sort(byCreated);
}

export function getEntry(id) {
  return run('entries', 'readonly', (s) => s.get(id));
}

// 新增或更新；回傳存好的日記
export async function saveEntry(entry) {
  const now = new Date().toISOString();
  const saved = {
    title: null, mood: null, image_path: null, image_source: null,
    image_status: 'none', image_prompt: null,
    ...entry,
    id: entry.id ?? crypto.randomUUID(),
    created_at: entry.created_at ?? now,
    updated_at: now,
  };
  await run('entries', 'readwrite', (s) => s.put(saved));
  return saved;
}

export async function deleteEntry(id) {
  const entry = await getEntry(id);
  if (entry?.image_path) await deleteImage(entry.image_path);
  await run('entries', 'readwrite', (s) => s.delete(id));
}

// ---- 圖片 ----
const urlCache = new Map();

function revoke(path) {
  const url = urlCache.get(path);
  if (url) URL.revokeObjectURL(url);
  urlCache.delete(path);
}

export async function putImage(path, blob) {
  revoke(path);
  await run('images', 'readwrite', (s) => s.put(blob, path));
}

export async function uploadImage(entryId, blob) {
  const path = `entries/${entryId}.jpg`;
  await putImage(path, blob);
  return path;
}

export async function deleteImage(path) {
  revoke(path);
  await run('images', 'readwrite', (s) => s.delete(path));
}

export async function getImageUrl(path) {
  if (!path) return null;
  if (urlCache.has(path)) return urlCache.get(path);
  const blob = await run('images', 'readonly', (s) => s.get(path));
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  urlCache.set(path, url);
  return url;
}

// ---- 設定 ----
const DEFAULT_SETTINGS = { theme: 'muji', image_style: 'muji', ai_enabled: true, background_path: null };

export async function getSettings() {
  const saved = await run('settings', 'readonly', (s) => s.get('app'));
  return { ...DEFAULT_SETTINGS, ...saved };
}

export async function saveSettings(settings) {
  const merged = { ...(await getSettings()), ...settings };
  await run('settings', 'readwrite', (s) => s.put(merged, 'app'));
  return merged;
}

// 請瀏覽器把資料標為「持久」，降低 iOS 清掉本機資料的機率
export function requestPersistence() {
  return navigator.storage?.persist?.().catch(() => false);
}
