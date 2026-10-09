import { chromium } from "@playwright/test";

const baseUrl = process.env.BRSE_APP_BASE_URL || "http://127.0.0.1:3010";
const routes = [
  { name: "Dashboard", path: "/app" },
  { name: "Todo", path: "/app/brse-todo" },
  { name: "Reports", path: "/app/reports" },
  { name: "Meeting Note", path: "/app/meeting-note" },
];

const maxWarmNavigationMs = Number(process.env.BRSE_MAX_WARM_NAV_MS || 3000);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 920 } });

const results = [];
try {
  await page.goto(`${baseUrl}/app`, { waitUntil: "domcontentloaded", timeout: 15_000 });
  await page.waitForSelector("main", { timeout: 8_000 });

  for (const route of routes) {
    const startedAt = Date.now();
    await page.goto(`${baseUrl}${route.path}`, { waitUntil: "domcontentloaded", timeout: 15_000 });
    await page.waitForSelector("main", { timeout: 8_000 });
    await page.waitForLoadState("networkidle", { timeout: 2_000 }).catch(() => {});
    const elapsedMs = Date.now() - startedAt;
    results.push({ ...route, elapsedMs });
  }
} finally {
  await browser.close();
}

for (const result of results) {
  console.log(`${result.name}: ${result.path} ${result.elapsedMs}ms`);
}

const slow = results.filter((result) => result.elapsedMs > maxWarmNavigationMs);
if (slow.length > 0) {
  console.error(`Warm navigation exceeded ${maxWarmNavigationMs}ms: ${slow.map((result) => `${result.name}=${result.elapsedMs}ms`).join(", ")}`);
  process.exit(1);
}

console.log(`Warm navigation smoke passed: ${results.length} routes under ${maxWarmNavigationMs}ms.`);
