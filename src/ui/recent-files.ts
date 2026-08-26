import { getLang } from '../i18n';

const DB_NAME = 'psdtool-recent';
const STORE = 'files';
const MAX_ENTRIES = 20;

export interface RecentEntry {
  key: string;
  name: string;
  size: number;
  lastModified: number;
  openTime: number;
  handle: FileSystemFileHandle | null;
  blob: Blob | null;
}

const langLabels: Record<string, { title: string; empty: string; remove: string }> = {
  en: { title: 'Recent Files', empty: 'No recent files yet.', remove: 'Remove' },
  ja: { title: '最近開いたファイル', empty: '最近開いたファイルはありません。', remove: '削除' },
  zh: { title: '最近打开', empty: '暂无最近打开的文件', remove: '移除' },
};

function L() { return langLabels[getLang()] ?? langLabels.en; }

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - ts;
  if (diff < 60000) return getLang() === 'zh' ? '刚刚' : getLang() === 'ja' ? 'たった今' : 'just now';
  if (diff < 3600000) return Math.floor(diff / 60000) + (getLang() === 'zh' ? '分钟前' : getLang() === 'ja' ? '分前' : 'm ago');
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString();
}

// ---- IndexedDB ----

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveRecent(file: File, handle: FileSystemFileHandle | null): Promise<void> {
  const key = `${file.name}:${file.size}:${file.lastModified}`;
  const entry: RecentEntry = {
    key,
    name: file.name,
    size: file.size,
    lastModified: file.lastModified,
    openTime: Date.now(),
    handle,
    blob: handle ? null : file,
  };
  try {
    const db = await openDB();
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(entry);
    await new Promise<void>((resolve) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
    // 清理超量
    const allReq = db.transaction(STORE, 'readonly').objectStore(STORE).getAll();
    allReq.onsuccess = () => {
      const all = allReq.result as RecentEntry[];
      if (all.length > MAX_ENTRIES) {
        all.sort((a, b) => a.openTime - b.openTime);
        const toRemove = all.slice(0, all.length - MAX_ENTRIES);
        const tx2 = db.transaction(STORE, 'readwrite');
        for (const e of toRemove) tx2.objectStore(STORE).delete(e.key);
      }
    };
  } catch { /* ignore */ }
}

export async function getRecentList(): Promise<RecentEntry[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => {
        const all = (req.result as RecentEntry[]).sort((a, b) => b.openTime - a.openTime);
        resolve(all);
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function removeRecent(key: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(key);
  } catch { /* ignore */ }
}

async function reopen(entry: RecentEntry): Promise<File | null> {
  if (entry.handle) {
    try {
      const perm = await (entry.handle as any).queryPermission({ mode: 'read' });
      if (perm !== 'granted') {
        const requested = await (entry.handle as any).requestPermission({ mode: 'read' });
        if (requested !== 'granted') return null;
      }
      return await entry.handle.getFile();
    } catch {
      return null;
    }
  }
  if (entry.blob) {
    return new File([entry.blob], entry.name, { type: entry.blob.type });
  }
  return null;
}

/** 尝试从拖放事件中提取 FileSystemFileHandle */
export async function getHandleFromDrop(e: DragEvent): Promise<FileSystemFileHandle | null> {
  const items = e.dataTransfer?.items;
  if (!items) return null;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.kind === 'file' && typeof (item as any).getAsFileSystemHandle === 'function') {
      try {
        const handle = await (item as any).getAsFileSystemHandle();
        if (handle && handle.kind === 'file') return handle as FileSystemFileHandle;
      } catch { /* ignore */ }
    }
  }
  return null;
}

// ---- UI ----

export function createRecentFilesPanel(
  onOpen: (file: File) => void,
): { container: HTMLElement; refresh: () => Promise<void> } {
  const container = document.createElement('div');
  container.className = 'panel panel-info';
  container.style.marginTop = '20px';

  const heading = document.createElement('div');
  heading.className = 'panel-heading';
  const title = document.createElement('h2');
  title.className = 'panel-title';
  title.textContent = L().title;
  heading.appendChild(title);
  container.appendChild(heading);

  const body = document.createElement('div');
  body.className = 'panel-body';
  container.appendChild(body);

  async function refresh() {
    body.innerHTML = '';
    const list = await getRecentList();
    if (list.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'text-muted';
      empty.textContent = L().empty;
      empty.style.margin = '0';
      body.appendChild(empty);
      return;
    }
    const ul = document.createElement('ul');
    ul.className = 'psdtool-recent-list';
    for (const entry of list) {
      const li = document.createElement('li');
      li.className = 'psdtool-recent-item';

      const link = document.createElement('a');
      link.href = '#';
      link.textContent = entry.name;
      link.title = `${entry.name} (${formatSize(entry.size)})`;
      link.addEventListener('click', async (e) => {
        e.preventDefault();
        const file = await reopen(entry);
        if (file) {
          onOpen(file);
        } else {
          alert(getLang() === 'zh' ? '无法访问该文件，请重新选择。' : getLang() === 'ja' ? 'ファイルにアクセスできません。再選択してください。' : 'Cannot access this file. Please re-select.');
        }
      });
      li.appendChild(link);

      const meta = document.createElement('span');
      meta.className = 'psdtool-recent-meta';
      meta.textContent = `${formatSize(entry.size)} · ${formatTime(entry.openTime)}`;
      li.appendChild(meta);

      const removeBtn = document.createElement('button');
      removeBtn.className = 'psdtool-recent-remove';
      removeBtn.textContent = '×';
      removeBtn.title = L().remove;
      removeBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await removeRecent(entry.key);
        await refresh();
      });
      li.appendChild(removeBtn);

      ul.appendChild(li);
    }
    body.appendChild(ul);
  }

  refresh();
  return { container, refresh };
}
