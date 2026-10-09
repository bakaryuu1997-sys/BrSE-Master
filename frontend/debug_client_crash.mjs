import { chromium } from "playwright";

async function debugClient() {
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on("console", (msg) => {
    console.log(`[CONSOLE ${msg.type().toUpperCase()}]:`, msg.text());
  });

  page.on("pageerror", (err) => {
    console.log("[PAGE UNCAUGHT ERROR]:", err.message);
    console.log(err.stack);
  });

  await page.addInitScript(() => {
    window.addEventListener("error", (e) => {
      console.log("[WINDOW ERROR EVENT]:", e.message, e.filename, e.lineno);
    });
    window.addEventListener("unhandledrejection", (e) => {
      console.log("[WINDOW UNHANDLED REJECTION]:", e.reason);
    });
  });

  console.log("Navigating to http://127.0.0.1:3010/app ...");
  await page.goto("http://127.0.0.1:3010/app", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(4000);

  // Kiểm tra xem window.__NEXT_DATA__ hoặc React root có gì
  const state = await page.evaluate(() => {
    return {
      hasReactRoot: document.getElementById("__next") !== null,
      title: document.title,
      bodyTextLength: document.body.innerText.length,
      scripts: Array.from(document.querySelectorAll("script")).map((s) => s.src || "inline"),
    };
  });
  console.log("Page Evaluation:", state);

  await browser.close();
}

debugClient().catch(console.error);
