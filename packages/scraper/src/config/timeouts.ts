export const TIMEOUTS = {
  SHORT: 5_000,
  NAVIGATION: 30_000,
  WAIT_FOR_RESPONSE: 15_000,
  HUMAN_DELAY_MIN: 2_500,
  HUMAN_DELAY_MAX: 6_000,
} as const;

export const JUSTDIAL_REAL_ESTATE_CATEGORIES: Record<string, string> = {
  "Real Estate Agents": "Real-Estate-Agents/nct-10192623",
  "Builders & Developers": "Builders-Developers/nct-10059258",
  "Real Estate Developers": "Builders-Developers/nct-10059258",
  "Property Dealers": "Real-Estate-Agents/nct-10192623",
  "Estate Agents For Residential Rental": "Estate-Agents-For-Residential-Rental/nct-10192844",
  "Estate Agents For Land": "Estate-Agents-For-Land/nct-10192716",
  "Real Estate Consultants": "Real-Estate-Consultants/nct-10892224",
  "Commercial Real Estate Agents": "Commercial-Real-Estate-Agents/nct-11617260",
};

export const DEFAULT_CATEGORIES = Object.keys(JUSTDIAL_REAL_ESTATE_CATEGORIES);

export function resolveJustdialCategoryPath(category: string): string {
  if (category.includes("/nct-") || category.includes("nct-")) {
    return category.replace(/^\/+/, "");
  }
  for (const [name, path] of Object.entries(JUSTDIAL_REAL_ESTATE_CATEGORIES)) {
    if (category.toLowerCase() === name.toLowerCase()) {
      return path;
    }
  }
  const slug = category
    .replace(/[^a-zA-Z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
  return slug;
}

export const PAN_INDIA_TARGET_CITIES = [
  "Mumbai",
  "Pune",
  "Bangalore",
  "Delhi",
  "Gurugram",
  "Noida",
  "Hyderabad",
  "Chennai",
  "Kolkata",
  "Ahmedabad",
  "Jaipur",
  "Surat",
  "Chandigarh",
  "Kochi",
  "Lucknow",
] as const;
