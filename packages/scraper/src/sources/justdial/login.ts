import { chromium } from "playwright";
import { getJustdialAuthPath } from "./auth";

export async function runJustdialInteractiveLogin(authDir?: string): Promise<void> {
  const savePath = getJustdialAuthPath(authDir);
  console.log("🔓 Launching headful browser for Justdial login...");
  console.log(`💾 Session will be saved to: ${savePath}`);
  console.log("👉 Please complete your login on the opened browser window (enter mobile number & OTP).");

  const browser = await chromium.launch({
    headless: false,
    args: ["--no-sandbox", "--window-size=1280,800"],
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    locale: "en-IN",
  });

  const page = await context.newPage();
  await page.goto("https://www.justdial.com", { waitUntil: "domcontentloaded" });

  console.log("⏳ Waiting for login completion (checking every 3s, timeout in 5 minutes)...");

  const maxWaitMs = 5 * 60 * 1000;
  const start = Date.now();
  let loggedIn = false;

  while (Date.now() - start < maxWaitMs) {
    await new Promise((r) => setTimeout(r, 3000));
    try {
      const cookies = await context.cookies();
      const authCookies = cookies.filter((c: { domain: string }) => c.domain.includes("justdial.com"));

      if (authCookies.length > 5) {
        loggedIn = true;
        break;
      }
    } catch {
      break;
    }
  }

  if (loggedIn) {
    await context.storageState({ path: savePath });
    console.log("✅ Justdial login session saved successfully!");
  } else {
    console.log("⚠️ Login timed out or not detected, saving current browser cookies anyway...");
    await context.storageState({ path: savePath });
  }

  await browser.close().catch(() => {});
}

if (process.argv[1]?.endsWith("login.ts") || process.argv[1]?.endsWith("login.js")) {
  runJustdialInteractiveLogin().catch((err) => {
    console.error("❌ Login failed:", err);
    process.exit(1);
  });
}
