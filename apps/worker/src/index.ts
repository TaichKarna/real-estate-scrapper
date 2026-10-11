import path from "node:path";
import { sql } from "drizzle-orm";
import { createDb } from "@real-estate-scrapper/db";
import { executeScrapeJob } from "./run-job";

const rootDbPath = path.resolve(process.cwd(), process.cwd().endsWith("worker") ? "../../local.db" : "local.db");
const DATABASE_URL = process.env.DATABASE_URL || `file:${rootDbPath}`;

const db = createDb({ DATABASE_URL });

let isRunning = true;

async function startWorkerLoop() {
  console.log("⚙️  Builder Lead Engine Worker process started");
  console.log(`🗄️  Database: ${DATABASE_URL}`);
  console.log("📡 Polling for queued scrape jobs every 5 seconds...");

  let lastHeartbeatAt = 0;

  while (isRunning) {
    try {
      const nowMs = Date.now();
      // Send worker heartbeat every 15s
      if (nowMs - lastHeartbeatAt >= 15000) {
        lastHeartbeatAt = nowMs;
        const infoStr = JSON.stringify({ pid: process.pid, status: "idle", startTime: new Date().toISOString() });
        await db
          .run(
            sql`REPLACE INTO heartbeat (key, info, seen_at) VALUES (${"worker"}, ${infoStr}, ${nowMs})`,
          )
          .catch(() => {});
      }

      // Claim oldest queued job
      const queuedJob = await db.query.scrapeJob.findFirst({
        where: { status: "queued" },
        orderBy: { createdAt: "asc" },
      });

      if (queuedJob) {
        console.log(`🚀 Claimed job ${queuedJob.id} (${queuedJob.type})`);
        await executeScrapeJob(db, queuedJob.id);
      }
    } catch (err) {
      console.error("❌ Worker loop error:", err);
    }

    await new Promise((r) => setTimeout(r, 5000));
  }
}

process.on("SIGINT", () => {
  console.log("🛑 Shutdown signal received. Exiting worker...");
  isRunning = false;
  process.exit(0);
});

startWorkerLoop().catch((err) => {
  console.error("Fatal worker error:", err);
  process.exit(1);
});
