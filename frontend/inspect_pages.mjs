import { chromium } from "playwright";

async function inspectPages() {
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  const page = await browser.newPage();

  // 1. Kiểm tra trang /app/notes
  console.log("Navigating to /app/notes...");
  await page.goto("http://127.0.0.1:3010/app/notes", { waitUntil: "networkidle" });
  await page.screenshot({ path: "screenshot_notes.png", fullPage: true });
  const notesText = await page.textContent("body");
  console.log("Notes page text snippet:", notesText.slice(0, 300).replace(/\s+/g, " "));

  // 2. Kiểm tra trang /app/meeting-note
  console.log("Navigating to /app/meeting-note...");
  await page.goto("http://127.0.0.1:3010/app/meeting-note", { waitUntil: "networkidle" });
  await page.screenshot({ path: "screenshot_meeting_note.png", fullPage: true });
  const meetingText = await page.textContent("body");
  console.log("Meeting Note page text snippet:", meetingText.slice(0, 300).replace(/\s+/g, " "));

  await browser.close();
}

inspectPages().catch(console.error);
