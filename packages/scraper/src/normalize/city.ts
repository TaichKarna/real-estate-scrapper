const CITY_ALIASES: Record<string, string> = {
  gurgaon: "Gurugram",
  bombay: "Mumbai",
  bangalore: "Bangalore",
  bengaluru: "Bangalore",
  calcutta: "Kolkata",
  madras: "Chennai",
  baroda: "Vadodara",
};

export function normalizeCity(rawCity: string): string {
  if (!rawCity) return "";
  const cleaned = rawCity.trim().toLowerCase();
  return CITY_ALIASES[cleaned] || rawCity.trim();
}
