#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const canonicalApiBase = "http://127.0.0.1:3010/api";
const violations = [];
const contractDoc = "docs/API_CONTRACTS.md";

const sharedEndpointContracts = [
  {
    endpoint: "/ai/status",
    backend: "backend/app/api/routes/ai.py",
    frontend: ["frontend/components/NineRouterStatus.tsx", "frontend/components/AiChatWidget.tsx"],
    extension: ["chrome-extension/src/background/modelSync.js", "chrome-extension/src/shared/settingsStatus.js"],
  },
  {
    endpoint: "/ai/model",
    backend: "backend/app/api/routes/ai.py",
    frontend: ["frontend/components/NineRouterStatus.tsx"],
    extension: ["chrome-extension/src/background/modelSync.js"],
  },
  {
    endpoint: "/ai/model-smoke",
    backend: "backend/app/api/routes/ai.py",
    frontend: ["frontend/components/NineRouterStatus.tsx", "scripts/check-ai-models.py"],
    extension: [],
  },
  {
    endpoint: "/ai/config",
    backend: "backend/app/api/routes/ai.py",
    frontend: [],
    extension: ["chrome-extension/src/options/options.js"],
  },
  {
    endpoint: "/ai/chat",
    backend: "backend/app/api/routes/ai.py",
    frontend: ["frontend/components/AiChatWidget.tsx"],
    extension: ["chrome-extension/src/shared/api.js", "chrome-extension/src/background/backendBridge.js"],
  },
  {
    endpoint: "/ai/chat/stream",
    backend: "backend/app/api/routes/ai.py",
    frontend: [],
    extension: ["chrome-extension/src/background/aiStream.js"],
  },
  {
    endpoint: "/ai/keigo",
    backend: "backend/app/api/routes/ai.py",
    frontend: [],
    extension: ["chrome-extension/src/background/backendBridge.js"],
  },
  {
    endpoint: "/ai/ocr",
    backend: "backend/app/api/routes/ai.py",
    frontend: [],
    extension: ["chrome-extension/src/background/background.js", "chrome-extension/src/content/ui/quickbox/chatComposer.js"],
  },
  {
    endpoint: "/glossary",
    backend: "backend/app/api/routes/glossary.py",
    frontend: [],
    extension: ["chrome-extension/src/background/glossarySync.js"],
  },
  {
    endpoint: "/knowledge",
    backend: "backend/app/api/routes/knowledge.py",
    frontend: ["frontend/lib/knowledge.ts"],
    extension: ["chrome-extension/src/background/glossarySync.js"],
  },
  {
    endpoint: "/client-state/entry",
    backend: "backend/app/api/routes/client_state.py",
    frontend: ["frontend/lib/clientState.ts", "frontend/lib/projectSettings.ts"],
    extension: ["chrome-extension/src/background/glossarySync.js"],
  },
  {
    endpoint: "/operations",
    backend: "backend/app/api/routes/operations.py",
    frontend: ["frontend/lib/operations.ts"],
    extension: ["chrome-extension/src/shared/api.js", "chrome-extension/src/background/backendBridge.js"],
  },
  {
    endpoint: "/todos/projects",
    backend: "backend/app/api/routes/todos.py",
    frontend: ["frontend/lib/brseTodo.ts"],
    extension: ["chrome-extension/src/background/backendBridge.js", "chrome-extension/src/sidepanel/specPreview.js"],
  },
  {
    endpoint: "/meeting-minutes",
    backend: "backend/app/api/routes/meeting_minutes.py",
    frontend: ["frontend/lib/meetingMinutes.ts"],
    extension: ["chrome-extension/src/background/backendBridge.js"],
  },
  {
    endpoint: "/meetings/upload",
    backend: "backend/app/api/routes/meetings_upload.py",
    frontend: ["frontend/lib/meetings.ts"],
    extension: ["chrome-extension/src/content/ui/MeetingRecorder.js"],
  },
];

function readText(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assertContains(relativePath, expected, message) {
  const text = readText(relativePath);
  if (!text.includes(expected)) {
    violations.push(`${relativePath}: ${message}`);
  }
}

function assertFileExists(relativePath, message) {
  if (!fs.existsSync(path.join(root, relativePath))) {
    violations.push(`${relativePath}: ${message}`);
  }
}

function listFiles(relativeDir, predicate) {
  const absoluteDir = path.join(root, relativeDir);
  const result = [];
  for (const entry of fs.readdirSync(absoluteDir, { withFileTypes: true })) {
    // Normalise to forward slashes so the allowlist comparisons below match on
    // Windows too (path.join would otherwise yield backslash-separated paths).
    const relativePath = path.join(relativeDir, entry.name).split(path.sep).join("/");
    if (entry.isDirectory()) {
      result.push(...listFiles(relativePath, predicate));
    } else if (predicate(relativePath)) {
      result.push(relativePath);
    }
  }
  return result;
}

function assertNoHostBackendInBrowserCode(relativeDirs) {
  const forbidden = /\bhttps?:\/\/(?:localhost|127\.0\.0\.1):8000\b/g;
  const files = relativeDirs.flatMap((dir) =>
    listFiles(dir, (file) => /\.(?:js|jsx|ts|tsx|html)$/.test(file))
  );
  for (const file of files) {
    const text = readText(file);
    const matches = text.match(forbidden);
    if (matches) {
      violations.push(`${file}: browser/extension code must use /api or ${canonicalApiBase}, found ${matches.join(", ")}`);
    }
  }
}

function assertNoScatteredExtensionApiBaseLiteral() {
  const allowed = new Set([
    "chrome-extension/src/shared/api.js",
    "chrome-extension/src/options/index.html",
    "chrome-extension/src/popup/index.html",
  ]);
  const files = listFiles("chrome-extension/src", (file) => /\.(?:js|html)$/.test(file));
  for (const file of files) {
    if (allowed.has(file)) continue;
    const text = readText(file);
    if (text.includes(canonicalApiBase)) {
      violations.push(`${file}: use DEFAULT_API_BASE/getApiBase instead of hardcoding ${canonicalApiBase}`);
    }
  }
}

function assertContractInventory() {
  assertContains(
    "docs/README.md",
    "`API_CONTRACTS.md`",
    "docs index must keep the shared API contract document visible"
  );
  assertContains(
    "docs/PROJECT_SOURCE_OF_TRUTH.md",
    "`docs/API_CONTRACTS.md`",
    "source-of-truth must list the shared API contract document"
  );

  for (const contract of sharedEndpointContracts) {
    assertContains(contractDoc, `\`${contract.endpoint}\``, `${contract.endpoint} must be inventoried`);
    assertFileExists(contract.backend, `${contract.endpoint} backend owner file must exist`);
    for (const frontendFile of contract.frontend) {
      assertContains(frontendFile, contract.endpoint, `${contract.endpoint} frontend client usage missing`);
    }
    for (const extensionFile of contract.extension) {
      assertContains(extensionFile, contract.endpoint, `${contract.endpoint} extension client usage missing`);
    }
  }
}

assertContains(
  "frontend/lib/config.ts",
  'process.env.NEXT_PUBLIC_API_BASE_URL || "/api"',
  "frontend browser API default must stay on the Next proxy"
);
assertContains(
  "chrome-extension/src/shared/api.js",
  `export const DEFAULT_API_BASE = "${canonicalApiBase}";`,
  "extension API default must stay on the frontend proxy"
);
assertContains(
  "chrome-extension/src/popup/popup.js",
  "DEFAULT_API_BASE",
  "popup must use the shared extension API base helper"
);
assertContains(
  "chrome-extension/src/options/options.js",
  "DEFAULT_API_BASE",
  "options page must use the shared extension API base helper"
);
assertContains(
  "docs/PROJECT_SOURCE_OF_TRUTH.md",
  `| Frontend API proxy | \`${canonicalApiBase}\` |`,
  "source-of-truth must document the canonical extension/browser API base"
);

assertContractInventory();
assertNoScatteredExtensionApiBaseLiteral();
assertNoHostBackendInBrowserCode([
  "chrome-extension/src",
  "frontend/app",
  "frontend/components",
  "frontend/features",
  "frontend/lib",
]);

if (violations.length) {
  console.error("Shared API contract check failed:");
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log("Shared API contract check passed.");
