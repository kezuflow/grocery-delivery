import { chromium } from "@playwright/test";
import os from "node:os";
import path from "node:path";

const profileDir = path.join(os.homedir(), ".codex-playwright-profile");
const url = process.argv[2] ?? "https://example.com";

const context = await chromium.launchPersistentContext(profileDir, {
  headless: false,
  viewport: null,
});

const page = context.pages()[0] ?? (await context.newPage());
await page.goto(url, { waitUntil: "domcontentloaded" });
console.log(`Opened ${page.url()}`);
console.log("Sign in in the browser window if needed. Press Enter here to close it.");

process.stdin.setEncoding("utf8");
process.stdin.resume();
process.stdin.once("data", async () => {
  await context.close();
});
