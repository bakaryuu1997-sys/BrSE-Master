import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock storage state to simulate chrome.storage.local behavior
let mockStorage = {};

const chromeMock = {
  storage: {
    local: {
      get: (keys, callback) => {
        const result = {};
        if (typeof keys === 'string') {
          result[keys] = mockStorage[keys];
        } else if (Array.isArray(keys)) {
          keys.forEach(k => { result[k] = mockStorage[k]; });
        } else if (typeof keys === 'object') {
          Object.keys(keys).forEach(k => {
            result[k] = mockStorage[k] !== undefined ? mockStorage[k] : keys[k];
          });
        }
        if (callback) callback(result);
        return Promise.resolve(result);
      },
      set: (items, callback) => {
        Object.assign(mockStorage, items);
        if (callback) callback();
        return Promise.resolve();
      },
      clear: (callback) => {
        mockStorage = {};
        if (callback) callback();
        return Promise.resolve();
      }
    }
  }
};

// Functions to test (matching extension's storage utilities)
async function addLearnedTerm(termId) {
  const data = await chromeMock.storage.local.get({ brseLearnedTerms: [] });
  const list = data.brseLearnedTerms || [];
  if (!list.includes(termId)) {
    list.push(termId);
    await chromeMock.storage.local.set({ brseLearnedTerms: list });
  }
  return list;
}

async function removeLearnedTerm(termId) {
  const data = await chromeMock.storage.local.get({ brseLearnedTerms: [] });
  const list = data.brseLearnedTerms || [];
  const index = list.indexOf(termId);
  if (index > -1) {
    list.splice(index, 1);
    await chromeMock.storage.local.set({ brseLearnedTerms: list });
  }
  return list;
}

async function clearAllLearnedTerms() {
  await chromeMock.storage.local.set({ brseLearnedTerms: [] });
  return [];
}

describe('Chrome Extension Learned Terms State Management', () => {
  beforeEach(() => {
    mockStorage = {
      brseLearnedTerms: ['term-1', 'term-2']
    };
  });

  it('should retrieve existing learned terms list correctly', async () => {
    const data = await chromeMock.storage.local.get({ brseLearnedTerms: [] });
    expect(data.brseLearnedTerms).toEqual(['term-1', 'term-2']);
  });

  it('should add a new term to the learned terms list', async () => {
    const updated = await addLearnedTerm('term-3');
    expect(updated).toContain('term-3');
    expect(updated.length).toBe(3);

    const data = await chromeMock.storage.local.get({ brseLearnedTerms: [] });
    expect(data.brseLearnedTerms).toEqual(['term-1', 'term-2', 'term-3']);
  });

  it('should not add duplicate term to the list', async () => {
    const updated = await addLearnedTerm('term-1');
    expect(updated.length).toBe(2);

    const data = await chromeMock.storage.local.get({ brseLearnedTerms: [] });
    expect(data.brseLearnedTerms).toEqual(['term-1', 'term-2']);
  });

  it('should remove a term from the list correctly', async () => {
    const updated = await removeLearnedTerm('term-1');
    expect(updated).not.toContain('term-1');
    expect(updated).toEqual(['term-2']);

    const data = await chromeMock.storage.local.get({ brseLearnedTerms: [] });
    expect(data.brseLearnedTerms).toEqual(['term-2']);
  });

  it('should clear all terms from the learned list', async () => {
    const updated = await clearAllLearnedTerms();
    expect(updated).toEqual([]);

    const data = await chromeMock.storage.local.get({ brseLearnedTerms: [] });
    expect(data.brseLearnedTerms).toEqual([]);
  });
});
