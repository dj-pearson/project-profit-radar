import { describe, expect, it } from 'vitest';
import {
  findEagerLazyOnlyChunks,
  manualChunkFor,
  type ChunkLike,
} from '../../../scripts/vite-chunking';

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

  it('leaves app code to Rollup', () => {
    expect(manualChunkFor('/repo/src/pages/Index.tsx')).toBeUndefined();
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
