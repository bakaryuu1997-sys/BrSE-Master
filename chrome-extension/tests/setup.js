// Mocking Chrome API
global.chrome = {
  runtime: {
    onInstalled: { addListener: vi.fn() },
    onMessage: { addListener: vi.fn() },
    sendMessage: vi.fn().mockResolvedValue({}),
    getURL: vi.fn((path) => `chrome-extension://mocked-id/${path}`)
  },
  i18n: {
    getMessage: vi.fn((key, substitutions) => {
      const translations = {
        "jiraSyncTaskErrorDetail": "Cannot import tasks automatically to project: $1",
        "jiraSyncTaskSuccess": "✓ Task Integration Successful",
        "jiraSyncTaskError": "❌ Task Sync Error",
        "jiraSyncTaskWarning": "⚠️ Failed to Parse Sub-tasks",
        "jiraSyncTaskWarningDetail": "AI did not output the appropriate JSON format to auto-import tasks. You can still copy tasks manually.",
        "jiraAutoImportedCount": "Automatically imported $1 sub-tasks into your Todo project on the Dashboard!"
      };
      const entry = translations[key];
      if (!entry) return key;
      if (!substitutions) return entry;
      const subs = Array.isArray(substitutions) ? substitutions : [substitutions];
      let res = entry;
      subs.forEach((sub, i) => {
        res = res.replace(`$${i + 1}`, sub);
      });
      return res;
    })
  },
  contextMenus: {
    create: vi.fn(),
    onClicked: { addListener: vi.fn() }
  },
  storage: {
    sync: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue({})
    }
  },
  tabs: {
    sendMessage: vi.fn(),
    query: vi.fn().mockResolvedValue([{ id: 1, url: 'https://example.com' }])
  },
  sidePanel: {
    open: vi.fn()
  },
  tts: {
    speak: vi.fn(),
    stop: vi.fn()
  }
};
