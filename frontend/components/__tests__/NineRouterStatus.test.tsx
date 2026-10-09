import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NineRouterStatus } from '../NineRouterStatus';
import React from 'react';

// Mock Lucide icons to prevent render complex SVG issues
vi.mock('lucide-react', () => ({
  Loader2: () => <div data-testid="loader">Loading...</div>,
  RefreshCw: () => <div data-testid="refresh">Refresh</div>,
}));

// Mock useUiLanguage hook
vi.mock('@/components/LanguageProvider', () => ({
  useUiLanguage: () => ({
    t: (key: string) => {
      const keys: Record<string, string> = {
        'ninerouter.readError': 'Failed to read status',
        'ninerouter.connectError': 'Failed to connect',
        'ninerouter.savingModel': 'Saving model...',
        'ninerouter.checking': 'Checking',
        'ninerouter.offline': 'Offline',
        'ninerouter.authWarning': '9router is running, but the API key is invalid or lacks permission.',
        'ninerouter.activeModel': 'Active model',
        'ninerouter.switchToStableModel': 'Switch to stable 9router model',
        'ninerouter.modelSmokeError': 'Failed to test model list.',
                'ninerouter.hideTestResults': 'Hide test results',
'ninerouter.testApiKey': 'Test AI API key',
        'ninerouter.testingModels': 'Testing models...',
      };
      return keys[key] || key;
    },
  }),
}));

describe('NineRouterStatus', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders loading state initially and then online status correctly', async () => {
    const mockStatus = {
      provider: '9router',
      base_url: 'http://localhost:20128/v1',
      model: 'qwen2.5-coder:7b-instruct',
      configured: true,
      runtime_reachable: true,
      runtime_status_code: 200,
      available_models: [
        { id: 'openrouter/nvidia/nemotron-3-super-120b-a12b:free', label: 'Nemotron 3 Super Free', provider: 'openrouter' },
                { id: 'cx/gpt-5.5', label: 'ChatGPT 5.5 Codex', provider: 'cx' },
{ id: 'qwen2.5-coder:7b-instruct', label: 'Qwen 2.5 Coder (Ollama)', provider: 'ollama' },
      ],
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockStatus,
    });

    render(<NineRouterStatus />);

    // Initially checking status
    expect(screen.getAllByText(/9router/i).length).toBeGreaterThan(0);

    // After async resolve
    await waitFor(() => {
      expect(screen.getByText('Runtime online · 200')).toBeDefined();
    });

    expect(screen.getByText('Qwen 2.5 Coder (Ollama)')).toBeDefined();
    expect(screen.getByText('Nemotron 3 Super Free')).toBeDefined();
  });

  it('renders offline state when connection fails', async () => {
    (global.fetch as any).mockRejectedValue(new Error('Network error'));

    render(<NineRouterStatus />);

    await waitFor(() => {
      expect(screen.getByText('Offline')).toBeDefined();
      expect(screen.getByText('Network error')).toBeDefined();
    });
  });

  it('renders warning state when 9router responds with auth failure', async () => {
    const mockStatus = {
      provider: '9router',
      base_url: 'http://localhost:20128/v1',
      model: 'free-logic',
      configured: true,
      runtime_reachable: true,
      runtime_status_code: 401,
      available_models: [
        { id: 'free-logic', label: '9router Free Logic', provider: '9router' },
      ],
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockStatus,
    });

    render(<NineRouterStatus />);

    await waitFor(() => {
      expect(screen.getByText('Runtime warning · 401')).toBeDefined();
      expect(screen.getByText('9router is running, but the API key is invalid or lacks permission.')).toBeDefined();
    });
  });

  it('allows model switching and invokes POST API', async () => {
    const mockStatus = {
      provider: '9router',
      base_url: 'http://localhost:20128/v1',
      model: 'qwen2.5-coder:7b-instruct',
      configured: true,
      runtime_reachable: true,
      runtime_status_code: 200,
      available_models: [
        { id: 'openrouter/nvidia/nemotron-3-super-120b-a12b:free', label: 'Nemotron 3 Super Free', provider: 'openrouter' },
                { id: 'cx/gpt-5.5', label: 'ChatGPT 5.5 Codex', provider: 'cx' },
{ id: 'qwen2.5-coder:7b-instruct', label: 'Qwen 2.5 Coder (Ollama)', provider: 'ollama' },
        { id: 'gemini/gemma-4-31b-it', label: 'Gemma 4 31B', provider: 'gemini' },
        { id: 'nvidia/google/gemma-4-31b-it', label: 'NVIDIA Gemma 4 31B', provider: 'nvidia' },
        { id: 'free-logic', label: '9router Free Logic', provider: 'combo' },
      ],
    };

    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockStatus,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ model: 'free-logic' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...mockStatus, model: 'free-logic' }),
      });

    render(<NineRouterStatus />);

    await waitFor(() => {
      expect(screen.getByText('Qwen 2.5 Coder (Ollama)')).toBeDefined();
    });

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'free-logic' } });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/ai/model'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ model: 'free-logic' }),
        })
      );
    });
  });

  it('shows a recovery action when Ollama is selected but unreachable', async () => {
    const mockStatus = {
      provider: 'ollama',
      base_url: 'http://localhost:11435',
      model: 'qwen2.5-coder:7b-instruct',
      configured: true,
      runtime_checked: true,
      runtime_reachable: false,
      runtime_error: 'All connection attempts failed',
      available_models: [
        { id: 'openrouter/nvidia/nemotron-3-super-120b-a12b:free', label: 'Nemotron 3 Super Free', provider: 'openrouter' },
                { id: 'cx/gpt-5.5', label: 'ChatGPT 5.5 Codex', provider: 'cx' },
{ id: 'qwen2.5-coder:7b-instruct', label: 'Qwen 2.5 Coder (Ollama)', provider: 'ollama' },
      ],
    };

    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockStatus,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ model: 'openrouter/nvidia/nemotron-3-super-120b-a12b:free' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...mockStatus,
          provider: '9router',
          model: 'openrouter/nvidia/nemotron-3-super-120b-a12b:free',
          runtime_reachable: true,
        }),
      });

    render(<NineRouterStatus />);

    const button = await screen.findByText('Switch to stable 9router model');
    fireEvent.click(button);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/ai/model'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ model: 'openrouter/nvidia/nemotron-3-super-120b-a12b:free' }),
        })
      );
    });
  });

  it('tests all AI models and renders green/red model status', async () => {
    const mockStatus = {
      provider: '9router',
      base_url: 'http://localhost:20128/v1',
      model: 'openrouter/nvidia/nemotron-3-super-120b-a12b:free',
      configured: true,
      runtime_reachable: true,
      runtime_status_code: 200,
      available_models: [
        { id: 'openrouter/nvidia/nemotron-3-super-120b-a12b:free', label: 'Nemotron 3 Super Free', provider: 'openrouter' },
                { id: 'cx/gpt-5.5', label: 'ChatGPT 5.5 Codex', provider: 'cx' },
{ id: 'free-logic', label: '9router Free Logic', provider: 'combo' },
      ],
    };

    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockStatus,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [
            {
              id: 'openrouter/nvidia/nemotron-3-super-120b-a12b:free',
              label: 'Nemotron 3 Super Free',
              provider: '9router',
              ok: true,
              status: 'ok',
              elapsed_ms: 1200,
            },
            {
              id: 'free-logic',
              label: '9router Free Logic',
              provider: '9router',
              ok: false,
              status: 'error',
              elapsed_ms: 800,
              error: 'provider unavailable',
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockStatus,
      });

    render(<NineRouterStatus />);

    const button = await screen.findByText('Test AI API key');
    fireEvent.click(button);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/ai/model-smoke'),
        expect.objectContaining({ method: 'POST' })
      );
      expect(screen.getByText('OK')).toBeDefined();
      expect(screen.getByText('NG')).toBeDefined();
      expect(screen.getByText(/provider unavailable/)).toBeDefined();
    });
  });
});

