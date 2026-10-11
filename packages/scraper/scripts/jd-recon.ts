/**
 * Phase 0 recon: open JustDial in a real (system) Chromium with a persistent profile,
 * run a category search, and dump everything we need to design the scraper:
 *  - every JSON/XHR response from justdial.com (url, method, postData, body)
 *  - search page HTML + __NEXT_DATA__ + screenshot, pagination links, card candidates
 *  - page 2 (via /page-2) first card names, to verify pagination works
 *  - the first detail page (_BZDET) HTML + screenshot
 *
 * Usage:  npx tsx packages/scraper/scripts/jd-recon.ts [City] [Category-Slug/nct-id]
 *   e.g.  npx tsx packages/scraper/scripts/jd-recon.ts Pune Real-Estate-Agents/nct-10192623
 */
import fs from "node:fs";
import path from "node:path";
import { chromium, type Page } from "playwright";

const city = process.argv[2] || "Pune";
const categoryPath = process.argv[3] || "Real-Estate-Agents/nct-10192623";

const CITY_COORDS: Record<string, { latitude: number; longitude: number }> = {
  Pune: { latitude: 18.5204, longitude: 73.8567 },
  Mumbai: { latitude: 19.076, longitude: 72.8777 },
  Delhi: { latitude: 28.6139, longitude: 77.209 },
  Noida: { latitude: 28.5355, longitude: 77.391 },
};

const repoRoot = path.resolve(import.meta.dirname, "../../..");
const outDir = path.join(repoRoot, ".recon", `jd-${Date.now()}`);
const profileDir = path.join(repoRoot, ".auth", "jd-profile");
fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(profileDir, { recursive: true });

const sleep = (min: number, max = min) => new Promise((r) => setTimeout(r, min + Math.random() * (max - min)));
const write = (name: string, data: unknown) =>
  fs.writeFileSync(path.join(outDir, name), typeof data === "string" ? data : JSON.stringify(data, null, 2));

let netIdx = 0;
const netIndex: { i: number; status: number; method: string; url: string; type: string; size: number }[] = [];

async function snapshot(page: Page, label: string) {
  write(`${label}.html`, await page.content().catch(() => ""));
  await page.screenshot({ path: path.join(outDir, `${label}.png`), fullPage: false }).catch(() => {});
  const info = await page
    .evaluate(() => {
      const d = (globalThis as any).document;
      const next = d.querySelector("#__NEXT_DATA__")?.textContent || null;
      const links = Array.from(d.querySelectorAll("a[href]")).map((a: any) => a.getAttribute("href") as string);
      return {
        url: (globalThis as any).location.href,
        title: d.title,
        hasNextData: !!next,
        nextDataSize: next?.length || 0,
        nextData: next,
        pageLinks: [...new Set(links.filter((h) => /page-\d+/.test(h)))].slice(0, 30),
        detailLinks: [...new Set(links.filter((h) => /_BZDET/.test(h)))].slice(0, 30),
        bodyTextStart: d.body?.innerText?.slice(0, 1500) || "",
      };
    })
    .catch((e) => ({ error: String(e) }) as any);
  if (info.nextData) {
    write(`${label}.next-data.json`, info.nextData);
    delete info.nextData;
  }
  write(`${label}.info.json`, info);
  console.log(`📸 ${label}: ${info.url} | title="${info.title}" | detailLinks=${info.detailLinks?.length} pageLinks=${info.pageLinks?.length} nextData=${info.hasNextData}`);
  return info;
}

async function humanScroll(page: Page, rounds: number) {
  for (let i = 0; i < rounds; i++) {
    await page.mouse.wheel(0, 400 + Math.random() * 500);
    await sleep(900, 2200);
  }
}

async function main() {
  console.log(`🔎 JD recon | city=${city} category=${categoryPath} | out=${outDir}`);
  const context = await chromium.launchPersistentContext(profileDir, {
    headless: false,
    executablePath: fs.existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined,
    viewport: null,
    locale: "en-IN",
    timezoneId: "Asia/Kolkata",
    geolocation: CITY_COORDS[city] || CITY_COORDS.Pune,
    permissions: ["geolocation"],
    args: ["--disable-blink-features=AutomationControlled", "--window-size=1400,900"],
  });
  const page = context.pages()[0] || (await context.newPage());

  context.on("response", async (res) => {
    try {
      const url = res.url();
      if (!url.includes("justdial")) return;
      const ct = res.headers()["content-type"] || "";
      const rt = res.request().resourceType();
      if (!(ct.includes("json") || rt === "xhr" || rt === "fetch")) return;
      const body = await res.text().catch(() => "");
      const i = ++netIdx;
      netIndex.push({ i, status: res.status(), method: res.request().method(), url, type: ct, size: body.length });
      write(`net-${String(i).padStart(3, "0")}.json`, {
        url,
        status: res.status(),
        method: res.request().method(),
        reqHeaders: res.request().headers(),
        postData: res.request().postData(),
        contentType: ct,
        body: body.slice(0, 500_000),
      });
    } catch {}
  });

  // 1. Warm-up on city page
  await page.goto(`https://www.justdial.com/${city}`, { waitUntil: "domcontentloaded", timeout: 45_000 }).catch((e) => console.log("nav:", e.message));
  await sleep(4000, 6000);
  await snapshot(page, "01-city");
  write("cookies-after-city.json", (await context.cookies()).map((c) => ({ name: c.name, domain: c.domain, expires: c.expires })));

  // 2. Deep-link to the canonical category listing
  await sleep(3000, 5000);
  const listUrl = `https://www.justdial.com/${city}/${categoryPath}`;
  console.log(`➡️ listing: ${listUrl}`);
  await page.goto(listUrl, { waitUntil: "domcontentloaded", timeout: 45_000 }).catch((e) => console.log("nav:", e.message));
  await sleep(5000, 7000);
  let search = await snapshot(page, "03-search");
  if (!search.detailLinks?.length) {
    console.log("↻ 0 detail links, trying one reload (known empty-render issue)");
    await page.reload({ waitUntil: "domcontentloaded" }).catch(() => {});
    await sleep(5000, 7000);
    search = await snapshot(page, "03b-search-reloaded");
  }

  // 3. Scroll to trigger lazy loading
  await humanScroll(page, 12);
  await snapshot(page, "04-search-scrolled");

  // 4. Try page 2
  const base = (search.url || "").split("?")[0].replace(/\/page-\d+$/, "");
  const page2Link = search.pageLinks?.find((h: string) => /page-2/.test(h));
  const page2Url = page2Link ? new URL(page2Link, "https://www.justdial.com").href : `${base}/page-2`;
  console.log(`➡️ page 2: ${page2Url} (${page2Link ? "from link" : "constructed"})`);
  await sleep(6000, 9000);
  await page.goto(page2Url, { waitUntil: "domcontentloaded", timeout: 45_000 }).catch((e) => console.log("nav:", e.message));
  await sleep(5000, 7000);
  await snapshot(page, "05-page2");
  await humanScroll(page, 6);
  await snapshot(page, "06-page2-scrolled");

  // 5. Detail page
  const detail = search.detailLinks?.[0];
  if (detail) {
    await sleep(6000, 9000);
    await page.goto(new URL(detail, "https://www.justdial.com").href, { waitUntil: "domcontentloaded", timeout: 45_000 }).catch((e) => console.log("nav:", e.message));
    await sleep(5000, 7000);
    await snapshot(page, "07-detail");
    await humanScroll(page, 4);
    await snapshot(page, "08-detail-scrolled");
  } else {
    console.log("⚠️ no _BZDET detail link found on search page");
  }

  write("net-index.json", netIndex);
  write("cookies-final.json", (await context.cookies()).map((c) => ({ name: c.name, domain: c.domain, expires: c.expires })));
  console.log(`✅ Recon done. ${netIndex.length} network JSON responses captured → ${outDir}`);
  await context.close();
}

main().catch((e) => {
  console.error("❌ recon failed:", e);
  process.exit(1);
});
