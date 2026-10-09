import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_EXTENSION_MODEL,
  EXTENSION_AI_MODELS,
  normalizeAiModel,
  persistActiveAiModel,
  readActiveAiModel,
  renderAiModelOptions,
} from '../src/shared/modelConfig.js';

function installStorageMocks() {
  const syncStore = {};
  const localStore = {};

  global.chrome.runtime.lastError = null;
  global.chrome.storage = {
    sync: {
      get: vi.fn((keys, callback) => {
        const keyList = Array.isArray(keys) ? keys : [keys];
        const result = Object.fromEntries(keyList.map((key) => [key, syncStore[key]]));
        callback(result);
      }),
      set: vi.fn((items, callback) => {
        Object.assign(syncStore, items);
        callback?.();
      }),
    },
    local: {
      get: vi.fn((keys, callback) => {
        const keyList = Array.isArray(keys) ? keys : [keys];
        const result = Object.fromEntries(keyList.map((key) => [key, localStore[key]]));
        callback(result);
      }),
      set: vi.fn((items, callback) => {
        Object.assign(localStore, items);
        callback?.();
      }),
    },
  };

  return { syncStore, localStore };
}

describe('extension model config', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('normalizes unknown models to the runtime-smoked stable default', () => {
    expect(normalizeAiModel('openrouter/nvidia/nemotron-3-super-120b-a12b:free')).toBe(
      'openrouter/nvidia/nemotron-3-super-120b-a12b:free',
    );
    expect(normalizeAiModel('cx/gpt-5.5')).toBe('cx/gpt-5.5');
    expect(normalizeAiModel('cloud-gemini')).toBe(DEFAULT_EXTENSION_MODEL);
    expect(normalizeAiModel('free-logic')).toBe('free-logic');
  });

  it('renders only verified models even when backend returns a large runtime list', () => {
    const select = document.createElement('select');
    renderAiModelOptions(select, 'free-logic', [
      ...EXTENSION_AI_MODELS,
      { id: 'qwen3.5:9b', label: 'Qwen 3.5', provider: 'ollama' },
    ]);

    expect(Array.from(select.options).map((option) => option.value)).toEqual([
      'openrouter/nvidia/nemotron-3-super-120b-a12b:free',
      'cx/gpt-5.5',
      'qwen2.5-coder:7b-instruct',
      'gemini/gemma-4-31b-it',
      'nvidia/google/gemma-4-31b-it',
      'free-logic',
    ]);
    expect(select.value).toBe('free-logic');
  });

  it('mirrors selected model into sync and local storage', async () => {
    const { syncStore, localStore } = installStorageMocks();

    const persisted = await persistActiveAiModel('free-logic');
    const active = await readActiveAiModel();

    expect(persisted).toBe('free-logic');
    expect(active).toBe('free-logic');
    expect(syncStore.aiModel).toBe('free-logic');
    expect(localStore.brseActiveChatModel).toBe('free-logic');
  });
});
