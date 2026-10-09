import { createLogger, defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json';

const logger = createLogger();
const suppressedThirdPartyWarnings = [
  '`esbuild` option was specified by "vite:react-babel" plugin',
  '`esbuild` option was specified by "crx:content-scripts" plugin',
  '`esbuild` option was specified by "crx:web-accessible-resources" plugin',
  'Both `rollupOptions` and `rolldownOptions` were specified by "crx:content-scripts" plugin',
  'We recommend switching to `@vitejs/plugin-react-oxc`',
  'optimizeDeps.rollupOptions` / `ssr.optimizeDeps.rollupOptions` is deprecated',
  '[PLUGIN_TIMINGS]',
];

function shouldSuppressThirdPartyWarning(message: unknown) {
  const text = typeof message === 'string' ? message : String(message);
  return suppressedThirdPartyWarnings.some((warning) => text.includes(warning));
}

export default defineConfig({
  customLogger: {
    ...logger,
    warn(message, options) {
      if (shouldSuppressThirdPartyWarning(message)) {
        return;
      }
      logger.warn(message, options);
    },
    warnOnce(message, options) {
      if (shouldSuppressThirdPartyWarning(message)) {
        return;
      }
      logger.warnOnce(message, options);
    },
  },
  plugins: [crx({ manifest })],
  build: {
    // Keep old content-script chunks so already-open tabs do not lose imports after a rebuild.
    emptyOutDir: false,
    rollupOptions: {
      // Build the detached Quick Memo window as its own HTML entry so its module
      // script is bundled (crxjs only auto-processes manifest-declared pages).
      input: {
        'quicknote-window': 'src/quicknote/index.html',
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    hmr: {
      port: 5173,
    },
  },
});
