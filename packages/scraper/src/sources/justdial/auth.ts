import fs from "node:fs";
import path from "node:path";
import type { Page } from "playwright";

export function getJustdialAuthPath(customDir?: string): string {
  if (customDir) {
    if (!fs.existsSync(customDir)) fs.mkdirSync(customDir, { recursive: true });
    return path.join(customDir, "justdial.json");
  }

  const baseDir = process.cwd().endsWith("worker")
    ? path.resolve(process.cwd(), ".auth")
    : path.resolve(process.cwd(), "apps/worker/.auth");

  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }
  return path.join(baseDir, "justdial.json");
}

export function hasSavedJustdialSession(customDir?: string): boolean {
  const file = getJustdialAuthPath(customDir);
  return fs.existsSync(file) && fs.statSync(file).size > 10;
}

export async function isJustdialLoggedIn(page: Page): Promise<boolean> {
  try {
    const cookies = await page.context().cookies();
    const hasAuthCookie = cookies.some(
      (c: { domain: string; name: string }) =>
        c.domain.includes("justdial.com") &&
        (c.name.includes("user") || c.name.includes("session") || c.name.includes("token") || c.name.includes("JD")),
    );
    return hasAuthCookie;
  } catch {
    return false;
  }
}

export function deleteJustdialSession(customDir?: string): boolean {
  try {
    const file = getJustdialAuthPath(customDir);
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
      console.log(`🗑️ Deleted stale/blocked Justdial session at: ${file}`);
      return true;
    }
  } catch (err: any) {
    console.warn(`⚠️ Failed to delete Justdial session file: ${err.message}`);
  }
  return false;
}


