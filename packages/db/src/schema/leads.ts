import { defineRelationsPart, sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { user } from "./auth";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

const createdAt = () =>
  integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull();

const updatedAt = () =>
  integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull();

export const LEAD_STATUSES = [
  "new",
  "contacted",
  "interested",
  "follow_up",
  "not_interested",
  "bad_data",
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_TYPES = [
  "Builder / Developer",
  "Real Estate Agent",
  "Rental Agent",
  "Plot / Land Dealer",
  "Property Consultant",
] as const;
export type LeadType = (typeof LEAD_TYPES)[number];

export const LEAD_SOURCES = ["justdial", "rera", "website", "google", "seed", "manual"] as const;
export type LeadSourceName = (typeof LEAD_SOURCES)[number];

export const JOB_TYPES = ["justdial", "rera", "enrich", "dedupe", "google"] as const;
export type JobType = (typeof JOB_TYPES)[number];

export const JOB_STATUSES = ["queued", "running", "done", "failed", "cancelled"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const ACTIVITY_TYPES = ["call", "note", "status_change", "email", "merge", "system"] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const CALL_OUTCOMES = [
  "interested",
  "call_back",
  "no_answer",
  "busy",
  "wrong_number",
  "not_interested",
] as const;
export type CallOutcome = (typeof CALL_OUTCOMES)[number];

export const CALL_REQUEST_STATUSES = ["pending", "delivered", "dialed", "done", "expired"] as const;
export type CallRequestStatus = (typeof CALL_REQUEST_STATUSES)[number];

export type Socials = Partial<
  Record<"linkedin" | "instagram" | "facebook" | "youtube" | "twitter" | "whatsapp", string>
>;

export type JobLogEntry = { at: number; level: "info" | "warn" | "error"; message: string };

export const lead = sqliteTable(
  "lead",
  {
    id: id(),
    name: text("name").notNull(),
    normalizedName: text("normalized_name").notNull(),
    contactPerson: text("contact_person"),
    primaryPhone: text("primary_phone"),
    phones: text("phones", { mode: "json" }).$type<string[]>().default([]).notNull(),
    emails: text("emails", { mode: "json" }).$type<string[]>().default([]).notNull(),
    website: text("website"),
    websiteDomain: text("website_domain"),
    address: text("address"),
    locality: text("locality"),
    city: text("city"),
    state: text("state"),
    pincode: text("pincode"),
    reraNumbers: text("rera_numbers", { mode: "json" }).$type<string[]>().default([]).notNull(),
    projectCount: integer("project_count").default(0).notNull(),
    activeProjectCount: integer("active_project_count").default(0).notNull(),
    rating: real("rating"),
    reviewCount: integer("review_count"),
    type: text("type", { enum: LEAD_TYPES }).default("Real Estate Agent").notNull(),
    categories: text("categories", { mode: "json" }).$type<string[]>().default([]).notNull(),
    socials: text("socials", { mode: "json" }).$type<Socials>().default({}).notNull(),
    sources: text("sources", { mode: "json" }).$type<LeadSourceName[]>().default([]).notNull(),
    score: integer("score").default(0).notNull(),
    status: text("status", { enum: LEAD_STATUSES }).default("new").notNull(),
    followUpAt: integer("follow_up_at", { mode: "timestamp_ms" }),
    lastContactedAt: integer("last_contacted_at", { mode: "timestamp_ms" }),
    assignedTo: text("assigned_to").references(() => user.id, { onDelete: "set null" }),
    notes: text("notes"),
    enrichedAt: integer("enriched_at", { mode: "timestamp_ms" }),
    mergedInto: text("merged_into"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("lead_city_idx").on(t.city),
    index("lead_state_idx").on(t.state),
    index("lead_status_idx").on(t.status),
    index("lead_primary_phone_idx").on(t.primaryPhone),
    index("lead_normalized_name_idx").on(t.normalizedName),
    index("lead_website_domain_idx").on(t.websiteDomain),
    index("lead_assigned_to_idx").on(t.assignedTo),
    index("lead_score_idx").on(t.score),
    index("lead_type_idx").on(t.type),
    index("lead_created_at_idx").on(t.createdAt),
  ],
);

export const leadSource = sqliteTable(
  "lead_source",
  {
    id: id(),
    leadId: text("lead_id")
      .notNull()
      .references(() => lead.id, { onDelete: "cascade" }),
    source: text("source", { enum: LEAD_SOURCES }).notNull(),
    externalId: text("external_id").notNull(),
    sourceUrl: text("source_url"),
    raw: text("raw", { mode: "json" }).$type<unknown>(),
    jobId: text("job_id"),
    scrapedAt: createdAt(),
  },
  (t) => [
    uniqueIndex("lead_source_source_external_idx").on(t.source, t.externalId),
    index("lead_source_lead_idx").on(t.leadId),
  ],
);

export const project = sqliteTable(
  "project",
  {
    id: id(),
    leadId: text("lead_id")
      .notNull()
      .references(() => lead.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    reraNumber: text("rera_number"),
    state: text("state"),
    district: text("district"),
    projectStatus: text("project_status"),
    completionDate: text("completion_date"),
    sourceUrl: text("source_url"),
    createdAt: createdAt(),
  },
  (t) => [
    index("project_lead_idx").on(t.leadId),
    uniqueIndex("project_rera_idx").on(t.reraNumber),
  ],
);

export const activity = sqliteTable(
  "activity",
  {
    id: id(),
    leadId: text("lead_id")
      .notNull()
      .references(() => lead.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    type: text("type", { enum: ACTIVITY_TYPES }).notNull(),
    outcome: text("outcome"),
    body: text("body"),
    createdAt: createdAt(),
  },
  (t) => [index("activity_lead_idx").on(t.leadId), index("activity_created_idx").on(t.createdAt)],
);

export type ScrapeJobParams = {
  cities?: string[];
  states?: string[];
  districts?: string[];
  categories?: string[];
  maxResults?: number;
  leadIds?: string[];
  onlyMissingEmail?: boolean;
  onlyActiveProjects?: boolean;
};

export const scrapeJob = sqliteTable(
  "scrape_job",
  {
    id: id(),
    type: text("type", { enum: JOB_TYPES }).notNull(),
    params: text("params", { mode: "json" }).$type<ScrapeJobParams>().default({}).notNull(),
    status: text("status", { enum: JOB_STATUSES }).default("queued").notNull(),
    progress: real("progress").default(0).notNull(),
    foundCount: integer("found_count").default(0).notNull(),
    newCount: integer("new_count").default(0).notNull(),
    updatedCount: integer("updated_count").default(0).notNull(),
    error: text("error"),
    log: text("log", { mode: "json" }).$type<JobLogEntry[]>().default([]).notNull(),
    cancelRequested: integer("cancel_requested", { mode: "boolean" }).default(false).notNull(),
    scheduleId: text("schedule_id"),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    startedAt: integer("started_at", { mode: "timestamp_ms" }),
    finishedAt: integer("finished_at", { mode: "timestamp_ms" }),
  },
  (t) => [index("scrape_job_status_idx").on(t.status), index("scrape_job_created_idx").on(t.createdAt)],
);

export const scrapeSchedule = sqliteTable("scrape_schedule", {
  id: id(),
  name: text("name").notNull(),
  type: text("type", { enum: JOB_TYPES }).notNull(),
  params: text("params", { mode: "json" }).$type<ScrapeJobParams>().default({}).notNull(),
  cron: text("cron").notNull(),
  enabled: integer("enabled", { mode: "boolean" }).default(true).notNull(),
  lastRunAt: integer("last_run_at", { mode: "timestamp_ms" }),
  createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
  createdAt: createdAt(),
});

export const callRequest = sqliteTable(
  "call_request",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    leadId: text("lead_id")
      .notNull()
      .references(() => lead.id, { onDelete: "cascade" }),
    phone: text("phone").notNull(),
    status: text("status", { enum: CALL_REQUEST_STATUSES }).default("pending").notNull(),
    outcome: text("outcome", { enum: CALL_OUTCOMES }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("call_request_user_status_idx").on(t.userId, t.status)],
);

export const heartbeat = sqliteTable("heartbeat", {
  key: text("key").primaryKey(),
  info: text("info", { mode: "json" }).$type<Record<string, unknown>>().default({}).notNull(),
  seenAt: integer("seen_at", { mode: "timestamp_ms" }).notNull(),
});

export const duplicateDismissal = sqliteTable(
  "duplicate_dismissal",
  {
    id: id(),
    leadA: text("lead_a").notNull(),
    leadB: text("lead_b").notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("duplicate_dismissal_pair_idx").on(t.leadA, t.leadB)],
);

export const leadRelations = defineRelationsPart(
  { user, lead, leadSource, project, activity, callRequest, scrapeJob },
  (r) => ({
    lead: {
      sourcesRows: r.many.leadSource({ from: r.lead.id, to: r.leadSource.leadId }),
      projects: r.many.project({ from: r.lead.id, to: r.project.leadId }),
      activities: r.many.activity({ from: r.lead.id, to: r.activity.leadId }),
      assignee: r.one.user({ from: r.lead.assignedTo, to: r.user.id }),
    },
    leadSource: {
      lead: r.one.lead({ from: r.leadSource.leadId, to: r.lead.id }),
    },
    project: {
      lead: r.one.lead({ from: r.project.leadId, to: r.lead.id }),
    },
    activity: {
      lead: r.one.lead({ from: r.activity.leadId, to: r.lead.id }),
      user: r.one.user({ from: r.activity.userId, to: r.user.id }),
    },
    callRequest: {
      lead: r.one.lead({ from: r.callRequest.leadId, to: r.lead.id }),
    },
  }),
);
