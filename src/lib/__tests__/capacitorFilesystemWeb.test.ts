import { describe, it, expect, beforeEach } from 'vitest';
import {
  WebFilesystem,
  fileKey,
  namesUnder,
  __setFileStore,
  type FileStore,
  type StoredFile,
} from '../capacitor-filesystem-web';

/**
 * happy-dom exposes no IndexedDB, so the persistence is injected. What is
 * asserted here is the part that was broken: the Capacitor API surface those
 * three consumers call, and the shapes they destructure out of it.
 */
function memoryStore(): FileStore {
  const files = new Map<string, StoredFile>();
  return {
    get: async (key) => files.get(key),
    put: async (file) => void files.set(file.path, file),
    delete: async (key) => void files.delete(key),
    keys: async () => [...files.keys()],
  };
}

beforeEach(() => __setFileStore(memoryStore()));

describe('fileKey', () => {
  it('joins the Capacitor directory and path into one key', () => {
    expect(fileKey('DATA', 'offline-sync/a.json')).toBe('DATA/offline-sync/a.json');
  });

  it('normalises leading and doubled slashes so one file is one key', () => {
    expect(fileKey('DATA', '/offline-sync//a.json')).toBe('DATA/offline-sync/a.json');
    expect(fileKey('/DATA/', 'offline-sync/a.json')).toBe('DATA/offline-sync/a.json');
  });

  it('defaults to DATA, which is the directory every caller passes', () => {
    expect(fileKey(undefined, 'x.json')).toBe('DATA/x.json');
  });
});

describe('namesUnder', () => {
  const keys = [
    'DATA/offline-sync/a.json',
    'DATA/offline-sync/b.json',
    'DATA/offline-sync/nested/c.json',
    'DATA/voice-notes/d.meta',
  ];

  it('lists only the entries directly under the prefix', () => {
    expect(namesUnder(keys, 'DATA/offline-sync').sort()).toEqual(['a.json', 'b.json', 'nested']);
  });

  it('does not leak entries from a sibling directory', () => {
    expect(namesUnder(keys, 'DATA/voice-notes')).toEqual(['d.meta']);
  });

  it('returns nothing for a directory with no entries', () => {
    expect(namesUnder(keys, 'DATA/photos')).toEqual([]);
  });
});

describe('WebFilesystem', () => {
  it('round-trips what useOfflineSync writes', async () => {
    const item = { id: 'offline_1', type: 'safety_incident', synced: false };
    await WebFilesystem.writeFile({
      path: 'offline-sync/offline_1.json',
      data: JSON.stringify(item),
      directory: 'DATA',
    });

    const { data } = await WebFilesystem.readFile({
      path: 'offline-sync/offline_1.json',
      directory: 'DATA',
    });
    expect(JSON.parse(data)).toEqual(item);
  });

  it('readdir returns entries with a .name, which is what the callers filter on', async () => {
    await WebFilesystem.writeFile({ path: 'offline-sync/a.json', data: '1', directory: 'DATA' });
    await WebFilesystem.writeFile({ path: 'offline-sync/b.txt', data: '2', directory: 'DATA' });

    const { files } = await WebFilesystem.readdir({ path: 'offline-sync', directory: 'DATA' });
    expect(files.filter((f) => f.name.endsWith('.json')).map((f) => f.name)).toEqual(['a.json']);
  });

  it('mkdir succeeds rather than throwing, because callers swallow its errors', async () => {
    await expect(
      WebFilesystem.mkdir({ path: 'offline-sync', directory: 'DATA', recursive: true })
    ).resolves.toBeUndefined();
  });

  it('deleteFile removes a synced item from the queue', async () => {
    await WebFilesystem.writeFile({ path: 'offline-sync/a.json', data: '1', directory: 'DATA' });
    await WebFilesystem.deleteFile({ path: 'offline-sync/a.json', directory: 'DATA' });

    const { files } = await WebFilesystem.readdir({ path: 'offline-sync', directory: 'DATA' });
    expect(files).toEqual([]);
  });

  it('reading a file that was never written fails, rather than returning empty data', async () => {
    await expect(
      WebFilesystem.readFile({ path: 'offline-sync/missing.json', directory: 'DATA' })
    ).rejects.toThrow(/does not exist/);
  });

  it('writeFile returns a uri, which useCameraCapture returns to its caller', async () => {
    const { uri } = await WebFilesystem.writeFile({
      path: 'photo_1.jpeg',
      data: 'base64',
      directory: 'DATA',
    });
    expect(uri).toContain('photo_1.jpeg');
  });
});
