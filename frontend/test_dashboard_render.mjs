import { chromium } from "playwright";

async function checkDashboardHtml() {
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  const page = await browser.newPage();

  page.on("console", (m) => console.log("[CONSOLE]", m.type(), m.text()));
  page.on("pageerror", (e) => console.log("[PAGEERROR]", e));

  await page.goto("http://localhost:3010/app", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);

  const mainHtml = await page.locator("main.brse-page").innerHTML();
  console.log("=== MAIN HTML LENGTH ===", mainHtml.length);
  console.log("=== FIRST 1000 CHARS OF MAIN HTML ===");
  console.log(mainHtml.slice(0, 1000));

  await browser.close();
}

checkDashboardHtml().catch(console.error);
