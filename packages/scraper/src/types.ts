import type { LeadSourceName, LeadType } from "@real-estate-scrapper/db";

export type ScrapedLead = {
  source: LeadSourceName;
  externalId: string;
  sourceUrl?: string;
  name: string;
  type?: LeadType;
  contactPerson?: string;
  phones: string[];
  emails: string[];
  website?: string;
  address?: string;
  locality?: string;
  city?: string;
  state?: string;
  pincode?: string;
  reraNumbers?: string[];
  projectCount?: number;
  rating?: number;
  reviewCount?: number;
  categories?: string[];
  raw?: unknown;
};

export type ScrapedProject = {
  name: string;
  reraNumber?: string;
  state?: string;
  district?: string;
  projectStatus?: string;
  completionDate?: string;
  sourceUrl?: string;
};

export type ScraperRunParams = {
  city?: string;
  state?: string;
  district?: string;
  category?: string;
  maxResults?: number;
  authPath?: string;
  onProgress?: (progress: { current: number; total: number; message: string }) => Promise<void> | void;
};

export interface SourceAdapter {
  readonly source: LeadSourceName;
  run(params: ScraperRunParams): AsyncIterable<{ lead: ScrapedLead; projects?: ScrapedProject[] }>;
}
