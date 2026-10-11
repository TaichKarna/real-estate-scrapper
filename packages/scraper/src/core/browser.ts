import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";

import { TIMEOUTS } from "../config/timeouts";

export type LaunchOptions = {
  headless?: boolean;
  storageStatePath?: string;
  userDataDir?: string;
  port?: number;
};

export async function createBrowserContext(options: LaunchOptions = {}): Promise<{
  context: BrowserContext;
  page: Page;
  close: () => Promise<void>;
}> {
  const headless = options.headless ?? false;
  const port = options.port || 9333;

  const defaultUserDataDir = path.resolve(process.cwd(), ".auth/jd-cdp-profile");
  const userDataDir = options.userDataDir || defaultUserDataDir;
  fs.mkdirSync(userDataDir, { recursive: true });

  const systemChromiumPaths = [
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
  ];
  const executablePath = systemChromiumPaths.find((p) => fs.existsSync(p));

  let proc: ChildProcess | null = null;
  let browser: Browser | null = null;
  let context: BrowserContext;
  let page: Page;

  if (executablePath) {
    // Launch system Chromium as a native process and attach via CDP to bypass Akamai bot detection
    const args = [
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${userDataDir}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--window-size=1400,900",
      headless ? "--headless=new" : "",
      "about:blank",
    ].filter(Boolean);

    proc = spawn(executablePath, args, { stdio: "ignore", detached: false });

    for (let i = 0; i < 35 && !browser; i++) {
      await new Promise((r) => setTimeout(r, 400));
      browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`).catch(() => null);
    }

    if (!browser) {
      if (proc) proc.kill();
      throw new Error(`Failed to connect to Chromium over CDP at port ${port}`);
    }

    context = browser.contexts()[0] || (await browser.newContext());
    page = context.pages()[0] || (await context.newPage());
  } else {
    // Fallback to standard Playwright launch if system browser is not available
    const fallbackBrowser = await chromium.launch({
      headless,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--window-size=1400,900"],
    });
    browser = fallbackBrowser;
    context = await fallbackBrowser.newContext({
      viewport: { width: 1400, height: 900 },
      locale: "en-IN",
      timezoneId: "Asia/Kolkata",
    });
    page = await context.newPage();
  }

  page.setDefaultTimeout(TIMEOUTS.NAVIGATION);

  return {
    context,
    page,
    close: async () => {
      try {
        if (browser) await browser.close().catch(() => {});
      } catch {}
      try {
        if (proc) proc.kill();
      } catch {}
    },
  };
}

export async function randomDelay(
  minMs: number = TIMEOUTS.HUMAN_DELAY_MIN,
  maxMs: number = TIMEOUTS.HUMAN_DELAY_MAX,
): Promise<void> {
  const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  await new Promise((r) => setTimeout(r, ms));
}

