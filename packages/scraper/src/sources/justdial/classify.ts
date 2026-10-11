import type { LeadType } from "@real-estate-scrapper/db";

export interface ClassifyInput {
  category?: string | null;
  subcategories?: (string | null | undefined)[];
  name?: string | null;
  typeField?: string | null;
}

/**
 * Classifies a real estate business into one of the 5 standardized types:
 * - Builder / Developer
 * - Real Estate Agent
 * - Rental Agent
 * - Plot / Land Dealer
 * - Property Consultant
 */
export function classifyLeadType(input: ClassifyInput): LeadType {
  const normCat = (input.category || "").toLowerCase();
  const normName = (input.name || "").toLowerCase();
  const normType = (input.typeField || "").toLowerCase();
  const allSubcats = (input.subcategories || [])
    .filter(Boolean)
    .map((s) => String(s).toLowerCase())
    .join(" ");

  const combined = `${normCat} ${normType} ${allSubcats}`;

  // 1. Rental Agent check (highest specificity for rental searches)
  if (
    normCat.includes("rental") ||
    normCat.includes("rent") ||
    combined.includes("residential rental") ||
    combined.includes("commercial rental") ||
    combined.includes("for rent") ||
    combined.includes("paying guest") ||
    combined.includes("flat on rent") ||
    normName.includes("rental") ||
    normName.includes("on rent") ||
    normName.includes("paying guest")
  ) {
    return "Rental Agent";
  }

  // 2. Plot / Land Dealer check
  if (
    normCat.includes("plot") ||
    normCat.includes("land") ||
    combined.includes("for plot") ||
    combined.includes("for land") ||
    combined.includes("agricultural land") ||
    combined.includes("farm house") ||
    combined.includes("na plot") ||
    combined.includes("industrial land") ||
    normName.includes("plots") ||
    normName.includes("land dealer") ||
    normName.includes("land developer") ||
    normName.includes("farmhouse")
  ) {
    return "Plot / Land Dealer";
  }

  // 3. Builder / Developer check
  if (
    normCat.includes("builder") ||
    normCat.includes("developer") ||
    combined.includes("builders") ||
    combined.includes("real estate developer") ||
    combined.includes("building contractors") ||
    combined.includes("promoters") ||
    combined.includes("civil contractor") ||
    normName.includes("builders") ||
    normName.includes("builder") ||
    normName.includes("developers") ||
    normName.includes("developer") ||
    normName.includes("constructions") ||
    normName.includes("infratech") ||
    normName.includes("promoters & developers") ||
    normName.includes("township")
  ) {
    return "Builder / Developer";
  }

  // 4. Property Consultant check
  if (
    normCat.includes("consultant") ||
    normCat.includes("consulting") ||
    normCat.includes("advisor") ||
    combined.includes("property consultant") ||
    combined.includes("real estate consultant") ||
    combined.includes("property advisor") ||
    combined.includes("property management") ||
    normName.includes("consultant") ||
    normName.includes("consultants") ||
    normName.includes("consulting") ||
    normName.includes("property advisor") ||
    normName.includes("advisory")
  ) {
    return "Property Consultant";
  }

  // 5. Default to Real Estate Agent
  return "Real Estate Agent";
}
