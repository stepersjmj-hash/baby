/* ============================================================
   store.js — IndexedDB 저장소
     works   : 갤러리에 저장한 완성작 (Blob)
     photos  : 퍼즐로 만들 내 사진 (줄여서 저장한 JPEG Blob)
     linework: 색칠용으로 외곽선만 딴 내 사진 (투명 PNG Blob)
     drafts  : 그리다 만 그림. 페이지별 1개, 앱을 껐다 켜도 이어서 색칠
   ============================================================ */

const DB = 'ainori';
const VER = 3;          // v2: photos(퍼즐용 사진) · v3: linework(색칠용 외곽선)
let dbp = null;

function open() {
  if (dbp) return dbp;
  dbp = new Promise((res, rej) => {
    const rq = indexedDB.open(DB, VER);
    rq.onupgradeneeded = () => {
      const db = rq.result;
      if (!db.objectStoreNames.contains('works'))
        db.createObjectStore('works', { keyPath: 'id', autoIncrement: true });
      if (!db.objectStoreNames.contains('drafts'))
        db.createObjectStore('drafts', { keyPath: 'pageId' });
      if (!db.objectStoreNames.contains('photos'))
        db.createObjectStore('photos', { keyPath: 'id', autoIncrement: true });
      if (!db.objectStoreNames.contains('linework'))
        db.createObjectStore('linework', { keyPath: 'id', autoIncrement: true });
    };
    rq.onsuccess = () => res(rq.result);
    rq.onerror = () => rej(rq.error);
  });
  return dbp;
}

async function tx(store, mode, fn) {
  const db = await open();
  return new Promise((res, rej) => {
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    let out;
    try { out = fn(s); } catch (e) { rej(e); return; }
    t.oncomplete = () => res(out && out.result !== undefined ? out.result : out);
    t.onerror = () => rej(t.error);
  });
}

export const works = {
  add:  (blob, pageId) => tx('works', 'readwrite', s => s.add({ blob, pageId, at: Date.now() })),
  all:  () => tx('works', 'readonly', s => s.getAll()),
  del:  (id) => tx('works', 'readwrite', s => s.delete(id))
};

export const photos = {
  add: (blob) => tx('photos', 'readwrite', s => s.add({ blob, at: Date.now() })),
  all: () => tx('photos', 'readonly', s => s.getAll()),
  del: (id) => tx('photos', 'readwrite', s => s.delete(id))
};

export const linework = {
  add: (blob) => tx('linework', 'readwrite', s => s.add({ blob, at: Date.now() })),
  all: () => tx('linework', 'readonly', s => s.getAll()),
  del: (id) => tx('linework', 'readwrite', s => s.delete(id))
};

export const drafts = {
  put: (pageId, blob) => tx('drafts', 'readwrite', s => s.put({ pageId, blob, at: Date.now() })),
  get: (pageId) => tx('drafts', 'readonly', s => s.get(pageId)),
  del: (pageId) => tx('drafts', 'readwrite', s => s.delete(pageId))
};
