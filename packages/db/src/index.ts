import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import type { DatabaseConfig } from "./config";
import { relations } from "./relations";

export function createDb(env: DatabaseConfig) {
  const client = createClient({
    url: env.DATABASE_URL,
  });

  if (env.DATABASE_URL.startsWith("file:")) {
    client.execute("PRAGMA journal_mode = WAL;").catch(() => {});
    client.execute("PRAGMA busy_timeout = 30000;").catch(() => {});
  }

  return drizzle({ client, relations });
}

export type Database = ReturnType<typeof createDb>;
export * from "./schema";





