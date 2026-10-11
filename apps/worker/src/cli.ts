import path from "node:path";
import { createDb, scrapeJob } from "@real-estate-scrapper/db";
import { executeScrapeJob } from "./run-job";


const rootDbPath = path.resolve(process.cwd(), process.cwd().endsWith("worker") ? "../../local.db" : "local.db");
const DATABASE_URL = process.env.DATABASE_URL || `file:${rootDbPath}`;


const db = createDb({ DATABASE_URL });

async function runCli() {
  const args = process.argv.slice(2);
  let source = "justdial";
  let city = "Pune";
  let category = "Real Estate Agents";
  let max = 1000;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--source" && args[i + 1]) source = args[i + 1]!;
    if (args[i] === "--city" && args[i + 1]) city = args[i + 1]!;
    if (args[i] === "--category" && args[i + 1]) category = args[i + 1]!;
    if (args[i] === "--max" && args[i + 1]) max = parseInt(args[i + 1]!, 10);
  }

  console.log(`🕷️ Creating manual CLI scrape job: ${source} | ${city} | ${category} | Max ${max}`);

  const [job] = await db
    .insert(scrapeJob)
    .values({
      type: source as any,
      params: {
        cities: [city],
        categories: [category],
        maxResults: max,
      },
      status: "queued",
    })
    .returning();

  if (!job) {
    console.error("❌ Failed to create scrape job");
    process.exit(1);
  }

  console.log(`🚀 Running scrape job ${job.id}...`);
  await executeScrapeJob(db, job.id);
  console.log("✅ CLI Scrape completed!");
  process.exit(0);
}

runCli().catch((err) => {
  console.error("❌ CLI error:", err);
  process.exit(1);
});
