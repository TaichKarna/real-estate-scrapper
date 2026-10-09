import { createAuth } from "@real-estate-scrapper/auth";
import { createDb } from "@real-estate-scrapper/db";

import { ENV } from "./env.server";

export const db = createDb(ENV);
export const auth = createAuth(ENV, db);
