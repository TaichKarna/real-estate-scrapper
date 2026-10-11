/**
 * Probe why JD listing pages render empty: logs document status/headers/body size,
 * Akamai _abck validation state, and compares deep-link vs in-site click navigation.
 * Usage: npx tsx packages/scraper/scripts/jd-probe.ts
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { chromium, type BrowserContext, type Page } from "playwright";

const MODE = process.env.MODE || "launch"; // "launch" (playwright launcher) | "cdp" (normal chromium + connectOverCDP)

const repoRoot = path.resolve(import.meta.dirname, "../../..");
const profileDir = path.join(repoRoot, ".auth", "jd-profile");
const outDir = path.join(repoRoot, ".recon", `probe-${Date.now()}`);
fs.mkdirSync(outDir, { recursive: true });
const sleep = (a: number, b = a) => new Promise((r) => setTimeout(r, a + Math.random() * (b - a)));

async function abck(ctx: BrowserContext) {
  const c = (await ctx.cookies()).find((x) => x.name === "_abck");
  // "~0~" in _abck => sensor validated; "~-1~" => not validated / challenged
  return c ? (c.value.includes("~0~") ? "VALID(~0~)" : c.value.includes("~-1~") ? "INVALID(~-1~)" : c.value.slice(0, 40)) : "none";
}

async function wiggle(page: Page, n = 15) {
  for (let i = 0; i < n; i++) {
    await page.mouse.move(100 + Math.random() * 1000, 100 + Math.random() * 600, { steps: 8 + Math.floor(Math.random() * 10) });
    await sleep(150, 450);
    if (i % 5 === 4) await page.mouse.wheel(0, 300 + Math.random() * 300);
  }
}

async function docInfo(page: Page, label: string) {
  const html = await page.content().catch(() => "");
  const info = await page.evaluate(() => {
    const d = (globalThis as any).document;
    const links = Array.from(d.querySelectorAll("a[href]")).map((a: any) => a.getAttribute("href") as string);
    return {
      url: (globalThis as any).location.href,
      title: d.title,
      bodyLen: d.body?.innerText?.length || 0,
      sampleLinks: links.filter((h) => /nct-|_BZDET|page-\d/.test(h)).slice(0, 15),
    };
  }).catch((e) => ({ error: String(e) }));
  fs.writeFileSync(path.join(outDir, `${label}.html`), html);
  await page.screenshot({ path: path.join(outDir, `${label}.png`) }).catch(() => {});
  console.log(`📄 [${label}] htmlLen=${html.length}`, JSON.stringify(info));
}

async function openContext(): Promise<{ ctx: BrowserContext; close: () => Promise<void> }> {
  if (MODE === "cdp") {
    const cdpProfile = path.join(repoRoot, ".auth", "jd-cdp-profile");
    fs.mkdirSync(cdpProfile, { recursive: true });
    const proc = spawn(
      "/usr/bin/chromium",
      [`--remote-debugging-port=9333`, `--user-data-dir=${cdpProfile}`, "--no-first-run", "--no-default-browser-check", "--window-size=1400,900", "about:blank"],
      { stdio: "ignore", detached: false },
    );
    let browser;
    for (let i = 0; i < 30 && !browser; i++) {
      await sleep(500);
      browser = await chromium.connectOverCDP("http://127.0.0.1:9333").catch(() => undefined);
    }
    if (!browser) throw new Error("could not connect over CDP");
    const ctx = browser.contexts()[0]!;
    return { ctx, close: async () => { await browser.close().catch(() => {}); proc.kill(); } };
  }
  const ctx = await chromium.launchPersistentContext(profileDir, {
    headless: false,
    executablePath: "/usr/bin/chromium",
    viewport: null,
    locale: "en-IN",
    timezoneId: "Asia/Kolkata",
    geolocation: { latitude: 18.5204, longitude: 73.8567 },
    permissions: ["geolocation"],
    args: ["--disable-blink-features=AutomationControlled", "--window-size=1400,900"],
  });
  return { ctx, close: () => ctx.close() };
}

async function main() {
  console.log(`🧪 MODE=${MODE}`);
  const { ctx, close } = await openContext();
  const page = ctx.pages()[0] || (await ctx.newPage());

  page.on("response", async (res) => {
    if (res.request().resourceType() !== "document") return;
    const h = res.headers();
    console.log(`🌐 DOC ${res.status()} ${res.url().slice(0, 110)} | server=${h["server"]} | ct=${h["content-type"]} | len=${h["content-length"]} | akamai-grn=${h["akamai-grn"] ?? ""}`);
  });
  page.on("requestfailed", (r) => {
    if (r.resourceType() === "document") console.log(`💥 DOC FAILED ${r.url().slice(0, 110)} :: ${r.failure()?.errorText}`);
  });
  const ua = await page.evaluate(() => (globalThis as any).navigator.userAgent);
  const wd = await page.evaluate(() => (globalThis as any).navigator.webdriver);
  console.log(`🧭 UA=${ua} | webdriver=${wd}`);

  // A. Warm city page, with mouse movement so Akamai sensor can validate
  await page.goto("https://www.justdial.com/Pune", { waitUntil: "domcontentloaded" }).catch((e) => console.log("nav", e.message));
  console.log("🍪 _abck after load:", await abck(ctx));
  await sleep(3000);
  await wiggle(page, 20);
  await sleep(3000);
  console.log("🍪 _abck after wiggle:", await abck(ctx));
  await docInfo(page, "A-city");

  // B. In-site click navigation to a real-estate category link
  const link = page.locator("a[href*='Real-Estate-Agents'], a[href*='Estate-Agents']").first();
  const count = await link.count();
  console.log(`🔗 in-site real-estate links found: ${count}`);
  if (count) {
    const href = await link.getAttribute("href");
    console.log(`🖱️ clicking ${href}`);
    await link.scrollIntoViewIfNeeded().catch(() => {});
    await sleep(800, 1500);
    await link.click({ timeout: 8000 }).catch((e) => console.log("click err", e.message));
    await page.waitForLoadState("domcontentloaded").catch(() => {});
    await sleep(6000, 8000);
    console.log("🍪 _abck:", await abck(ctx));
    await docInfo(page, "B-click-category");
    await wiggle(page, 10);
    await docInfo(page, "B2-click-category-scrolled");
  }

  // C. Deep-link to canonical Pune URL after validated session
  await sleep(6000, 9000);
  await page.goto("https://www.justdial.com/Pune/Real-Estate-Agents/nct-10192623", { waitUntil: "domcontentloaded" }).catch((e) => console.log("nav", e.message));
  await sleep(6000, 8000);
  console.log("🍪 _abck:", await abck(ctx));
  await docInfo(page, "C-deeplink");

  console.log(`✅ probe done → ${outDir}`);
  await close();
}

main().catch((e) => {
  console.error("❌", e);
  process.exit(1);
});
