import { chromium } from "playwright";

async function check404() {
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  const page = await browser.newPage();

  page.on("response", (res) => {
    if (res.status() === 404) {
      console.log("==> 404 RESOURCE:", res.url());
    }
  });

  await page.goto("http://127.0.0.1:3010/app", { waitUntil: "networkidle" });
  await browser.close();
}

check404().catch(console.error);
