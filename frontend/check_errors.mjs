import { chromium } from "playwright";

async function checkFailedRequests() {
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  const page = await browser.newPage();

  page.on("requestfailed", (req) => {
    console.log("REQUEST FAILED:", req.url(), req.failure()?.errorText);
  });

  page.on("response", (res) => {
    if (res.status() >= 400) {
      console.log("HTTP ERROR:", res.status(), res.url());
    }
  });

  await page.goto("http://127.0.0.1:3010/app", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);

  // Chụp ảnh xem màn hình Playwright thấy cái gì
  await page.screenshot({ path: "dashboard_playwright.png" });
  await browser.close();
}

checkFailedRequests().catch(console.error);
