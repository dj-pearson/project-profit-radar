import { describe, expect, it } from 'vitest';
import {
  findEagerLazyOnlyChunks,
  isEagerModule,
  manualChunkFor,
  type ChunkLike,
  type ChunkMeta,
} from '../../../scripts/vite-chunking';

/** A module graph for manualChunks' `meta`: id -> static importers. */
const graph = (entries: string[], importers: Record<string, string[]>): ChunkMeta => {
  const getModuleInfo = (id: string) =>
    id in importers || entries.includes(id)
      ? { isEntry: entries.includes(id), importers: importers[id] ?? [] }
      : null;
  return { getModuleInfo };
};

// US-388: the entry chunk imported vite's preload helper out of `three` and
// Babel's extends helper out of `recharts`, so index.html modulepreloaded both.

describe('manualChunkFor', () => {
  it('pins shared runtime helpers to the always-loaded framework chunk', () => {
    expect(manualChunkFor('\0vite/preload-helper.js')).toBe('framework');
    expect(manualChunkFor('\0commonjsHelpers.js')).toBe('framework');
    expect(
      manualChunkFor('/repo/node_modules/@babel/runtime/helpers/esm/extends.js'),
    ).toBe('framework');
  });

  it('keeps the heavy libraries in their own chunks', () => {
    expect(manualChunkFor('/repo/node_modules/three/build/three.module.js')).toBe('three');
    expect(manualChunkFor('/repo/node_modules/@react-three/fiber/dist/index.js')).toBe('three');
    expect(manualChunkFor('/repo/node_modules/recharts/es6/index.js')).toBe('recharts');
    expect(manualChunkFor('/repo/node_modules/d3-scale/src/index.js')).toBe('recharts');
    expect(manualChunkFor('C:\\repo\\node_modules\\xlsx\\xlsx.mjs')).toBe('xlsx');
  });

  it('puts Radix the shell imports in framework and the rest in lazy ui-library', () => {
    const toast = '/repo/node_modules/@radix-ui/react-toast/dist/index.mjs';
    const select = '/repo/node_modules/@radix-ui/react-select/dist/index.mjs';
    const meta = graph(['/repo/src/main.tsx'], {
      '/repo/src/components/ui/toast.tsx': ['/repo/src/App.tsx'],
      '/repo/src/App.tsx': ['/repo/src/main.tsx'],
      [toast]: ['/repo/src/components/ui/toast.tsx'],
      // select.tsx is only reached through a lazy page (no static importer).
      '/repo/src/components/ui/select.tsx': [],
      [select]: ['/repo/src/components/ui/select.tsx'],
    });
    expect(manualChunkFor(toast, meta)).toBe('framework');
    expect(manualChunkFor(select, meta)).toBe('ui-library');
    expect(manualChunkFor(select)).toBe('ui-library');
  });

  it('keeps only TanStack Query in the query chunk', () => {
    expect(manualChunkFor('/repo/node_modules/@tanstack/query-core/build/modern/index.js')).toBe('query');
    expect(manualChunkFor('/repo/node_modules/@tanstack/virtual-core/dist/esm/index.js')).toBeUndefined();
  });

  it('leaves app code to Rollup', () => {
    expect(manualChunkFor('/repo/src/pages/Index.tsx')).toBeUndefined();
  });
});

describe('isEagerModule', () => {
  it('follows static importers up to an entry, through cycles', () => {
    const meta = graph(['main'], {
      a: ['b'],
      b: ['a', 'main'],
      lazyOnly: ['c'],
      c: ['lazyOnly'],
    });
    expect(isEagerModule('a', meta)).toBe(true);
    expect(isEagerModule('lazyOnly', meta)).toBe(false);
  });
});

describe('findEagerLazyOnlyChunks', () => {
  const chunk = (fileName: string, name: string, imports: string[], isEntry = false): ChunkLike => ({
    type: 'chunk',
    fileName,
    name,
    imports,
    isEntry,
  });

  it('flags a lazy-only chunk the entry reaches through static imports', () => {
    const bundle = {
      'index.js': chunk('index.js', 'index', ['framework.js', 'recharts.js'], true),
      'framework.js': chunk('framework.js', 'framework', []),
      'recharts.js': chunk('recharts.js', 'recharts', ['framework.js']),
      'three.js': chunk('three.js', 'three', ['recharts.js']),
    };
    expect(findEagerLazyOnlyChunks(bundle)).toEqual(['recharts']);
  });

  it('follows transitive static imports', () => {
    const bundle = {
      'index.js': chunk('index.js', 'index', ['shared.js'], true),
      'shared.js': chunk('shared.js', 'shared', ['three.js']),
      'three.js': chunk('three.js', 'three', []),
    };
    expect(findEagerLazyOnlyChunks(bundle)).toEqual(['three']);
  });

  it('passes when the heavy chunks are only dynamically imported', () => {
    const bundle = {
      'index.js': chunk('index.js', 'index', ['framework.js'], true),
      'framework.js': chunk('framework.js', 'framework', []),
      'three.js': chunk('three.js', 'three', ['framework.js']),
      'style.css': { type: 'asset', fileName: 'style.css' } as ChunkLike,
    };
    expect(findEagerLazyOnlyChunks(bundle)).toEqual([]);
  });
});
