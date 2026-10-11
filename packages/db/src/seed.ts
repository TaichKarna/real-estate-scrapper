import path from "node:path";
import { sql } from "drizzle-orm";
import * as schema from "./schema";

import { createDb } from "./index";



const defaultDbPath = path.resolve(process.cwd(), "../../local.db");
const DATABASE_URL = process.env.DATABASE_URL || `file:${defaultDbPath}`;

const db = createDb({ DATABASE_URL });



const SEED_BUILDERS = [
  {
    name: "Godrej Properties Ltd",
    contactPerson: "Rajesh Sharma (Sales VP)",
    phones: ["+919820012345", "+912261234567"],
    emails: ["sales@godrejproperties.com", "info@godrejproperties.com"],
    website: "https://www.godrejproperties.com",
    address: "Godrej One, 5th Floor, Pirojshanagar, Eastern Express Highway, Vikhroli East",
    locality: "Vikhroli",
    city: "Mumbai",
    state: "Maharashtra",
    pincode: "400079",
    reraNumbers: ["P51800000123", "P51800000456"],
    projectCount: 14,
    activeProjectCount: 8,
    rating: 4.6,
    reviewCount: 342,
    categories: ["Real Estate Developers", "Residential Builders", "Luxury Projects"],
    socials: { linkedin: "https://linkedin.com/company/godrej-properties", whatsapp: "+919820012345" },
    sources: ["justdial", "rera", "website"] as schema.LeadSourceName[],
    score: 95,
    status: "interested" as schema.LeadStatus,
    notes: "High intent builder. Looking for channel partner automation.",
    projects: [
      { name: "Godrej Horizon", reraNumber: "P51800000123", state: "Maharashtra", district: "Mumbai City", projectStatus: "Ongoing", completionDate: "2027-12" },
      { name: "Godrej Urban Park", reraNumber: "P51800000456", state: "Maharashtra", district: "Mumbai Suburban", projectStatus: "Ongoing", completionDate: "2026-06" },
    ],
  },
  {
    name: "Prestige Estates Projects Ltd",
    contactPerson: "Kiran Kumar",
    phones: ["+918025591080", "+919900011223"],
    emails: ["enquiry@prestigeconstructions.com"],
    website: "https://www.prestigeconstructions.com",
    address: "Prestige Falcon Towers, 19 Brunton Road",
    locality: "MG Road",
    city: "Bangalore",
    state: "Karnataka",
    pincode: "560025",
    reraNumbers: ["PRM/KA/RERA/1251/310/PR/170915/000124"],
    projectCount: 22,
    activeProjectCount: 12,
    rating: 4.7,
    reviewCount: 512,
    categories: ["Real Estate Developers", "Commercial Developers"],
    socials: { linkedin: "https://linkedin.com/company/prestige-group" },
    sources: ["rera", "website"] as schema.LeadSourceName[],
    score: 90,
    status: "new" as schema.LeadStatus,
    notes: "Imported from Karnataka RERA.",
    projects: [
      { name: "Prestige Park Grove", reraNumber: "PRM/KA/RERA/1251/310/PR/170915/000124", state: "Karnataka", district: "Bangalore Urban", projectStatus: "Ongoing", completionDate: "2028-03" },
    ],
  },
  {
    name: "Sobha Limited",
    contactPerson: "Anil Menon",
    phones: ["+918049320000", "+919845012345"],
    emails: ["sales.blr@sobha.com"],
    website: "https://www.sobha.com",
    address: "Sarjapur-Marathahalli Outer Ring Road, Bellandur Post",
    locality: "Outer Ring Road",
    city: "Bangalore",
    state: "Karnataka",
    pincode: "560103",
    reraNumbers: ["PRM/KA/RERA/1251/310/PR/170920/000210"],
    projectCount: 18,
    activeProjectCount: 9,
    rating: 4.8,
    reviewCount: 420,
    categories: ["Luxury Apartments", "Residential Builders"],
    socials: { linkedin: "https://linkedin.com/company/sobha-limited" },
    sources: ["justdial", "rera"] as schema.LeadSourceName[],
    score: 88,
    status: "follow_up" as schema.LeadStatus,
    followUpAt: new Date(Date.now() + 86400000 * 2), // 2 days from now
    notes: "Requested a demo next Tuesday.",
    projects: [
      { name: "Sobha Neopolis", reraNumber: "PRM/KA/RERA/1251/310/PR/170920/000210", state: "Karnataka", district: "Bangalore Urban", projectStatus: "Ongoing", completionDate: "2027-09" },
    ],
  },
  {
    name: "Panchshil Realty",
    contactPerson: "Siddharth Chordia",
    phones: ["+912066473200", "+919822099887"],
    emails: ["info@panchshil.com"],
    website: "https://www.panchshil.com",
    address: "Tech Park One, Tower E, 191 Yerwada",
    locality: "Yerwada",
    city: "Pune",
    state: "Maharashtra",
    pincode: "411006",
    reraNumbers: ["P52100002456"],
    projectCount: 10,
    activeProjectCount: 5,
    rating: 4.9,
    reviewCount: 280,
    categories: ["Luxury Real Estate", "Commercial Tech Parks"],
    socials: { instagram: "https://instagram.com/panchshil_realty" },
    sources: ["justdial", "website"] as schema.LeadSourceName[],
    score: 85,
    status: "contacted" as schema.LeadStatus,
    notes: "Called on Monday, receptionist forwarded to Marketing head.",
    projects: [
      { name: "Panchshil Towers Kharadi", reraNumber: "P52100002456", state: "Maharashtra", district: "Pune", projectStatus: "Ongoing", completionDate: "2026-12" },
    ],
  },
  {
    name: "Kolte-Patil Developers",
    contactPerson: "Vikram Patil",
    phones: ["+912066937000", "+919890011224"],
    emails: ["sales@koltepatil.com"],
    website: "https://www.koltepatil.com",
    address: "210, City Point, Dhole Patil Road",
    locality: "Bund Garden",
    city: "Pune",
    state: "Maharashtra",
    pincode: "411001",
    reraNumbers: ["P52100000889"],
    projectCount: 15,
    activeProjectCount: 7,
    rating: 4.4,
    reviewCount: 195,
    categories: ["Builders & Developers", "Township Developers"],
    socials: {},
    sources: ["justdial"] as schema.LeadSourceName[],
    score: 75,
    status: "new" as schema.LeadStatus,
    notes: "Scraped from Justdial Pune listings.",
    projects: [],
  },
  {
    name: "DLF Limited",
    contactPerson: "Amitabh Singh",
    phones: ["+911244396000", "+919810055443"],
    emails: ["customercare@dlf.in"],
    website: "https://www.dlf.in",
    address: "DLF Gateway Tower, R Block, DLF City Phase III",
    locality: "DLF Phase 3",
    city: "Gurugram",
    state: "Haryana",
    pincode: "122002",
    reraNumbers: ["HRERA-PKL-GGM-101-2021"],
    projectCount: 30,
    activeProjectCount: 14,
    rating: 4.6,
    reviewCount: 610,
    categories: ["Commercial Developers", "Luxury Villas"],
    socials: { linkedin: "https://linkedin.com/company/dlf-limited" },
    sources: ["rera", "website"] as schema.LeadSourceName[],
    score: 92,
    status: "interested" as schema.LeadStatus,
    notes: "Expressed interest in lead verification tools.",
    projects: [
      { name: "DLF The Aralias II", reraNumber: "HRERA-PKL-GGM-101-2021", state: "Haryana", district: "Gurugram", projectStatus: "Ongoing", completionDate: "2028-06" },
    ],
  },
  {
    name: "Aparna Constructions & Estates",
    contactPerson: "Subba Rao",
    phones: ["+914023358888", "+919849012345"],
    emails: ["sales@aparnaconstructions.com"],
    website: "https://www.aparnaconstructions.com",
    address: "#802, Door No: 6-3-352/2&3, Astral Heights, Road No. 1, Banjara Hills",
    locality: "Banjara Hills",
    city: "Hyderabad",
    state: "Telangana",
    pincode: "500034",
    reraNumbers: ["P02400003456"],
    projectCount: 25,
    activeProjectCount: 11,
    rating: 4.7,
    reviewCount: 380,
    categories: ["Gated Communities", "Highrise Apartments"],
    socials: { whatsapp: "+919849012345" },
    sources: ["rera", "justdial"] as schema.LeadSourceName[],
    score: 86,
    status: "new" as schema.LeadStatus,
    notes: "Imported via TG-RERA.",
    projects: [
      { name: "Aparna Zenith", reraNumber: "P02400003456", state: "Telangana", district: "Ranga Reddy", projectStatus: "Ongoing", completionDate: "2027-01" },
    ],
  },
  {
    name: "Casagrand Builder Private Limited",
    contactPerson: "Arun Kumar",
    phones: ["+914444111111", "+919884012345"],
    emails: ["sales@casagrand.co.in"],
    website: "https://www.casagrand.co.in",
    address: "NPM Tower, No. 10, Zone-14, Module 4th Floor, Salai Street",
    locality: "Nungambakkam",
    city: "Chennai",
    state: "Tamil Nadu",
    pincode: "600034",
    reraNumbers: ["TN/01/Building/0123/2022"],
    projectCount: 20,
    activeProjectCount: 10,
    rating: 4.5,
    reviewCount: 290,
    categories: ["Residential Builders", "Villa Communities"],
    socials: {},
    sources: ["justdial"] as schema.LeadSourceName[],
    score: 80,
    status: "not_interested" as schema.LeadStatus,
    notes: "Already using an in-house CRM setup.",
    projects: [],
  },
  {
    name: "Adani Realty",
    contactPerson: "Ketan Mehta",
    phones: ["+917925555555", "+919979012345"],
    emails: ["info@adanirealty.com"],
    website: "https://www.adanirealty.com",
    address: "Adani Corporate House, Shantigram, Near Vaishnodevi Circle",
    locality: "S G Highway",
    city: "Ahmedabad",
    state: "Gujarat",
    pincode: "382421",
    reraNumbers: ["PR/GJ/AHMEDABAD/AHMEDABAD CITY/AUDA/RAA00123/070917"],
    projectCount: 12,
    activeProjectCount: 6,
    rating: 4.6,
    reviewCount: 210,
    categories: ["Integrated Townships", "Commercial Spaces"],
    socials: { linkedin: "https://linkedin.com/company/adani-realty" },
    sources: ["rera", "website"] as schema.LeadSourceName[],
    score: 84,
    status: "contacted" as schema.LeadStatus,
    notes: "Initial outreach message sent on WhatsApp.",
    projects: [],
  },
  {
    name: "Merlin Group",
    contactPerson: "Sushil Mohta",
    phones: ["+913340154545", "+919830012345"],
    emails: ["sales@merlinprojects.com"],
    website: "https://www.merlinprojects.com",
    address: "Acropolis, 15th Floor, 1858/1, Rajdanga Main Road",
    locality: "EM Bypass",
    city: "Kolkata",
    state: "West Bengal",
    pincode: "700107",
    reraNumbers: ["HIRA/P/KOL/2018/000112"],
    projectCount: 16,
    activeProjectCount: 7,
    rating: 4.5,
    reviewCount: 175,
    categories: ["Real Estate Developers"],
    socials: {},
    sources: ["justdial"] as schema.LeadSourceName[],
    score: 78,
    status: "bad_data" as schema.LeadStatus,
    notes: "Number bounced when calling office desk.",
    projects: [],
  },
];

async function seed() {
  console.log("🌱 Seeding database with builder leads...");

  // Clear existing seed leads
  await db.delete(schema.lead).where(sql`exists (select 1 from ${schema.leadSource} where ${schema.leadSource.leadId} = ${schema.lead.id} and ${schema.leadSource.source} = 'seed')`);


  for (const b of SEED_BUILDERS) {
    const { projects, notes, ...leadData } = b;
    const normalizedName = leadData.name
      .toLowerCase()
      .replace(/pvt|ltd|private|limited|builders|developers|constructions|group|realty|real estate/g, "")
      .replace(/[^a-z0-9]/g, "")
      .trim();

    const [insertedLead] = await db
      .insert(schema.lead)
      .values({
        ...leadData,
        normalizedName: normalizedName || leadData.name.toLowerCase().replace(/[^a-z0-9]/g, ""),
        primaryPhone: leadData.phones[0] || null,
        websiteDomain: leadData.website ? new URL(leadData.website).hostname.replace(/^www\./, "") : null,
        notes,
      })
      .returning();

    if (!insertedLead) continue;

    // Add source provenance
    for (const src of leadData.sources) {
      await db.insert(schema.leadSource).values({
        leadId: insertedLead.id,
        source: src,
        externalId: `seed-${src}-${insertedLead.id.slice(0, 8)}`,
        sourceUrl: leadData.website || null,
      });
    }

    // Add projects
    for (const proj of projects) {
      await db
        .insert(schema.project)
        .values({
          leadId: insertedLead.id,
          ...proj,
        })
        .onConflictDoNothing();
    }


    // Add initial activity
    await db.insert(schema.activity).values({
      leadId: insertedLead.id,
      type: "system",
      body: `Lead created from ${leadData.sources.join(", ")} seed data.`,
    });

    if (notes) {
      await db.insert(schema.activity).values({
        leadId: insertedLead.id,
        type: "note",
        body: notes,
      });
    }
  }

  console.log(`✅ Successfully seeded ${SEED_BUILDERS.length} builder leads!`);
}

seed()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .then(() => {
    process.exit(0);
  });

