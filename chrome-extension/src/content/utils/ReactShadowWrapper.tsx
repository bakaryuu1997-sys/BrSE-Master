import React from 'react';
import ReactDOM from 'react-dom/client';
import { injectThemeTokens } from '../../shared/theme.js';

interface ReactShadowWrapperOptions {
  id: string;
  cssContent?: string;
  className?: string;
}

export function createReactShadowRoot(
  Component: React.ComponentType<any>,
  options: ReactShadowWrapperOptions
) {
  const { id, cssContent, className } = options;

  // Cleanup old root if it exists to avoid leakages
  const existing = document.getElementById(id);
  if (existing) {
    existing.remove();
  }

  // Create host element
  const host = document.createElement('div');
  host.id = id;
  if (className) {
    host.className = className;
  }

  // Attach shadow root
  const shadowRoot = host.attachShadow({ mode: 'open' });

  // Inject shared design tokens so component styles can use var(--brse-*)
  injectThemeTokens(shadowRoot);

  // Inject styles if provided
  if (cssContent) {
    const style = document.createElement('style');
    style.textContent = cssContent;
    shadowRoot.appendChild(style);
  }

  // Create mount point
  const mountPoint = document.createElement('div');
  mountPoint.id = 'brse-shadow-react-root';
  mountPoint.style.width = '100%';
  mountPoint.style.height = '100%';
  shadowRoot.appendChild(mountPoint);

  document.body.appendChild(host);

  // Mount React
  const root = ReactDOM.createRoot(mountPoint);
  root.render(<Component />);

  return {
    host,
    shadowRoot,
    root,
    cleanup: () => {
      root.unmount();
      host.remove();
    }
  };
}
