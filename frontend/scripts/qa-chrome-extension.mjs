import { chromium } from "@playwright/test";
import { createServer } from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..");
const extensionDir = path.join(repoRoot, "chrome-extension", "dist");

const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>BrSE Extension QA Fixture</title>
    <style>
      body { font-family: Arial, sans-serif; line-height: 1.6; padding: 48px; }
      main { max-width: 760px; }
      code { display: block; white-space: pre; background: #111827; color: #e5e7eb; padding: 16px; }
    </style>
  </head>
  <body>
    <main>
      <h1>BrSE Extension QA Fixture</h1>
      <p id="glossary-text">This page explains server side rendering for a BrSE workflow.</p>
      <p id="selectable">Triple click this sentence to open the Subaru selection toolbar.</p>
      <code id="code-sample">export default defineConfig({
  server: { port: 3010 }
})</code>
    </main>
  </body>
</html>`;

function startFixtureServer() {
  const server = createServer((req, res) => {
    if (req.url?.startsWith("/watch")) {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(html.replace("BrSE Extension QA Fixture", "YouTube No Caption Fixture"));
      return;
    }
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(html);
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve({ server, port: address.port });
    });
  });
}

async function waitForExtensionWorker(context) {
  let [worker] = context.serviceWorkers();
  if (!worker) worker = await context.waitForEvent("serviceworker", { timeout: 10000 });
  const extensionId = worker.url().split("/")[2];
  if (!extensionId) throw new Error(`Could not resolve extension id from ${worker.url()}`);
  return { worker, extensionId };
}

async function setExtensionStorage(worker) {
  const payload = {
    brseGlossaryHighlightEnabled: true,
    brseGlossaryCache: [
      {
        id: "qa-server-side-rendering",
        english: "server side rendering",
        japanese: "サーバーサイドレンダリング",
        vietnamese: "render phía server",
        category: "Technical",
      },
      {
        id: "qa-define-config",
        english: "defineConfig",
        japanese: "defineConfig",
        vietnamese: "defineConfig",
        category: "Technical",
      },
    ],
    brseLearnedTerms: [],
    toolbarMode: "auto",
    apiBaseUrl: "http://127.0.0.1:3010/api",
    aiModel: "openrouter/nvidia/nemotron-3-super-120b-a12b:free",
  };
  await worker.evaluate((items) => {
    return new Promise((resolve) => chrome.storage.local.set(items, resolve));
  }, payload);
  await worker.evaluate((items) => {
    return new Promise((resolve) => chrome.storage.sync.set(items, resolve));
  }, payload);
}

async function clickFloatingMenuAction(page, actionId) {
  await page.evaluate((id) => {
    const root = document.getElementById("brse-trigger-root");
    if (!root?.shadowRoot) throw new Error("Floating trigger shadow root missing");
    const button = root.shadowRoot.querySelector(".btn-container");
    button.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, button: 0, clientX: 30, clientY: 30 }));
    document.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, button: 0, clientX: 30, clientY: 30 }));
    const action = root.shadowRoot.getElementById(id);
    if (!action) throw new Error(`Floating menu action missing: ${id}`);
    action.click();
  }, actionId);
}

async function assertSelectionToolbar(page) {
  await page.evaluate(() => {
    const target = document.getElementById("selectable");
    const range = document.createRange();
    range.selectNodeContents(target);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);

    target.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, button: 0, detail: 2, clientX: 120, clientY: 160 }));
    target.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, button: 0, detail: 2, clientX: 120, clientY: 160 }));
  });
  await page.waitForTimeout(350);
  const doubleClickToolbar = await page.locator("#brse-toolbar-root").count();
  if (doubleClickToolbar !== 0) throw new Error("Selection toolbar appeared on double click");

  await page.evaluate(() => {
    const target = document.getElementById("selectable");
    target.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, button: 0, detail: 3, clientX: 120, clientY: 160 }));
    target.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, button: 0, detail: 3, clientX: 120, clientY: 160 }));
  });
  await page.waitForSelector("#brse-toolbar-root", { timeout: 5000 });
}

async function run() {
  const { server, port } = await startFixtureServer();
  const userDataDir = await mkdtemp(path.join(tmpdir(), "brse-extension-qa-"));
  const consoleErrors = [];
  const headless = process.env.BRSE_EXTENSION_QA_HEADLESS === "1";
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless,
    args: [
      `--disable-extensions-except=${extensionDir}`,
      `--load-extension=${extensionDir}`,
      "--no-sandbox",
      `--host-resolver-rules=MAP brse-qa.test 127.0.0.1,MAP www.youtube.com.test 127.0.0.1`,
    ],
  });

  try {
    const { worker, extensionId } = await waitForExtensionWorker(context);
    await setExtensionStorage(worker);

    const page = await context.newPage();
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => consoleErrors.push(error.message));

    await page.goto(`http://brse-qa.test:${port}/fixture`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("#brse-trigger-root", { timeout: 10000 });
    await page.waitForSelector(".brse-glossary-highlight", { timeout: 10000 });

    await assertSelectionToolbar(page);

    await clickFloatingMenuAction(page, "btn-quick-note");
    await page.waitForSelector("#brse-quick-note-root", { timeout: 5000 });
    const noteReady = await page.evaluate(() => {
      const root = document.getElementById("brse-quick-note-root");
      return Boolean(root?.shadowRoot?.getElementById("brse-qn-text"));
    });
    if (!noteReady) throw new Error("Quick Memo textarea missing");

    await clickFloatingMenuAction(page, "btn-summarize-vi");
    await page.waitForSelector("#brse-qb-root", { timeout: 5000 });

    const ytPage = await context.newPage();
    await ytPage.goto(`http://www.youtube.com.test:${port}/watch?v=no-caption`, { waitUntil: "domcontentloaded" });
    await ytPage.waitForSelector("#brse-trigger-root", { timeout: 10000 });
    await clickFloatingMenuAction(ytPage, "btn-summarize-ja");
    await ytPage.waitForSelector("#brse-qb-root", { timeout: 5000 });

    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extensionId}/src/popup/index.html`);
    await popup.click('button[data-tab="settings"]');
    await popup.selectOption("#aiModel", "openrouter/nvidia/nemotron-3-super-120b-a12b:free");
    await popup.fill("#apiBaseUrl", "http://127.0.0.1:3010/api");
    await popup.click("#btn-save-config");
    await popup.waitForFunction(() => {
      const status = document.querySelector("#config-status")?.textContent || "";
      return /Đã lưu|Lưu local|AI/.test(status);
    }, { timeout: 10000 });

    const sidepanel = await context.newPage();
    await sidepanel.goto(`chrome-extension://${extensionId}/src/sidepanel/index.html`);
    await sidepanel.waitForSelector("#chat-input", { timeout: 5000 });
    await sidepanel.waitForSelector("#sidepanel-model-select", { timeout: 5000 });

    const seriousErrors = consoleErrors.filter((text) => !/Failed to load resource|favicon/i.test(text));
    if (seriousErrors.length) {
      throw new Error(`Browser console errors:\n${seriousErrors.join("\n")}`);
    }

    console.log("Chrome Extension browser QA smoke passed.");
    console.log(`Fixture URLs: http://brse-qa.test:${port}/fixture, http://www.youtube.com.test:${port}/watch?v=no-caption`);
    console.log(`Extension id: ${extensionId}`);
  } finally {
    await context.close();
    server.close();
    await rm(userDataDir, { recursive: true, force: true });
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
