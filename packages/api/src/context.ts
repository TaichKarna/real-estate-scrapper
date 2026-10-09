import type { Session } from "@real-estate-scrapper/auth";
import type { Database } from "@real-estate-scrapper/db";

export type Context = {
  session: Session | null;
  db: Database;
};
