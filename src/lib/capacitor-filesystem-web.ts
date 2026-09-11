/**
 * A working Filesystem for the web build.
 *
 * vite.config.ts aliases `@capacitor/filesystem` to the web fallback, and that
 * fallback rejected every call with "Filesystem not available on web". Three
 * consumers depend on it, and the consequence was not a missing nicety:
 *
 *   useOfflineSync  - the offline queue behind the safety-incident, time,
 *                     equipment and daily-report capture screens. Going
 *                     offline on brikly.net meant `Submission Error`, and the
 *                     report was gone.
 *   VoiceNotes      - recordings and their metadata.
 *   useCameraCapture- captured photos.
 *
 * IndexedDB rather than localStorage: these store base64 photos and audio,
 * which blow past a 5MB quota immediately, and localStorage is synchronous.
 *
 * This implements the slice of the Capacitor Filesystem API those three
 * actually call - writeFile, readFile, readdir, deleteFile, mkdir - with the
 * same return shapes. Directories are implicit, as they are in any key-value
 * store: mkdir succeeds and records nothing, and readdir lists the keys under
 * a prefix.
 *
 * When IndexedDB is absent the calls reject, exactly as before. A memory-backed
 * fake would be worse than the current failure: the caller would report the
 * data saved, and it would vanish on reload.
 */

export interface StoredFile {
  path: string;
  data: string;
  mtime: number;
}

/** The persistence the shim sits on, so the API mapping can be tested. */
export interface FileStore {
  get(key: string): Promise<StoredFile | undefined>;
  put(file: StoredFile): Promise<void>;
  delete(key: string): Promise<void>;
  keys(): Promise<string[]>;
}

const DB_NAME = 'brikly-capacitor-fs';
const STORE = 'files';

/** `Directory.Data` + a path, normalised so `a//b` and `/a/b` are one key. */
export function fileKey(directory: string | undefined, path: string): string {
  const dir = (directory || 'DATA').replace(/^\/+|\/+$/g, '');
  const rest = path.replace(/^\/+/, '').replace(/\/{2,}/g, '/');
  return `${dir}/${rest}`;
}

/** Names directly under `prefix`, without recursing into deeper folders. */
export function namesUnder(keys: string[], prefix: string): string[] {
  const base = prefix.endsWith('/') ? prefix : `${prefix}/`;
  const names = new Set<string>();
  for (const key of keys) {
    if (!key.startsWith(base)) continue;
    const rest = key.slice(base.length);
    if (!rest) continue;
    names.add(rest.split('/')[0]);
  }
  return [...names];
}

let storePromise: Promise<FileStore> | null = null;

async function indexedDbStore(): Promise<FileStore> {
  if (typeof indexedDB === 'undefined') {
    throw new Error(
      'Filesystem is unavailable: this browser exposes no IndexedDB, so offline ' +
        'capture cannot be stored. Reconnect before saving.',
    );
  }
  const { openDB } = await import('idb');
  const db = await openDB(DB_NAME, 1, {
    upgrade(database) {
      if (!database.objectStoreNames.contains(STORE)) {
        database.createObjectStore(STORE, { keyPath: 'path' });
      }
    },
  });
  return {
    get: (key) => db.get(STORE, key) as Promise<StoredFile | undefined>,
    put: (file) => db.put(STORE, file).then(() => undefined),
    delete: (key) => db.delete(STORE, key).then(() => undefined),
    keys: () => db.getAllKeys(STORE) as Promise<string[]>,
  };
}

/** Swap the persistence layer. Used by the tests; production never calls it. */
export function __setFileStore(store: FileStore | null): void {
  storePromise = store ? Promise.resolve(store) : null;
}

function store(): Promise<FileStore> {
  if (!storePromise) storePromise = indexedDbStore();
  return storePromise;
}

interface PathArgs {
  path: string;
  directory?: string;
}

export const WebFilesystem = {
  async writeFile(options: PathArgs & { data: string; encoding?: string }) {
    const key = fileKey(options.directory, options.path);
    await (await store()).put({ path: key, data: options.data, mtime: Date.now() });
    // Capacitor returns a uri; callers only ever pass it around or display it.
    return { uri: `idb://${DB_NAME}/${key}` };
  },

  async readFile(options: PathArgs & { encoding?: string }) {
    const key = fileKey(options.directory, options.path);
    const file = await (await store()).get(key);
    if (!file) throw new Error(`File does not exist: ${key}`);
    return { data: file.data };
  },

  async deleteFile(options: PathArgs) {
    await (await store()).delete(fileKey(options.directory, options.path));
  },

  async readdir(options: PathArgs) {
    const prefix = fileKey(options.directory, options.path);
    const keys = await (await store()).keys();
    return {
      files: namesUnder(keys, prefix).map((name) => ({
        name,
        type: 'file' as const,
        size: 0,
        mtime: 0,
        uri: `idb://${DB_NAME}/${prefix}/${name}`,
      })),
    };
  },

  // Directories are implicit in a key-value store. Succeeding here matters:
  // every caller wraps mkdir in a try/catch that swallows "already exists".
  async mkdir(_options: PathArgs & { recursive?: boolean }) {
    await store();
  },

  async rmdir(options: PathArgs & { recursive?: boolean }) {
    const prefix = fileKey(options.directory, options.path);
    const s = await store();
    const base = prefix.endsWith('/') ? prefix : `${prefix}/`;
    for (const key of await s.keys()) {
      if (key.startsWith(base)) await s.delete(key);
    }
  },

  async stat(options: PathArgs) {
    const key = fileKey(options.directory, options.path);
    const file = await (await store()).get(key);
    if (!file) throw new Error(`File does not exist: ${key}`);
    return { type: 'file' as const, size: file.data.length, mtime: file.mtime, uri: `idb://${DB_NAME}/${key}` };
  },
};
