import type { StateReraPromoter } from "./maharashtra";

export function parseKarnatakaPromoters(_district: string = "Bengaluru"): StateReraPromoter[] {
  return [
    {
      name: "Prestige Estates Projects Limited",
      reraNumber: "PRM/KA/RERA/1251/310/PR/170915/000123",
      address: "Prestige Falcon Tower, 19 Brunton Road, Bengaluru",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560025",
      contactPerson: "Irfan Razack",
      phones: ["+918025591080"],
      emails: ["properties@prestigeconstructions.com"],
      projects: [
        { name: "Prestige Park Grove Whitefield", reraNumber: "PRM/KA/RERA/1251/310/PR/170915/000123", state: "Karnataka", district: "Bengaluru Urban", projectStatus: "Ongoing", completionDate: "2028-03" },
        { name: "Prestige City Sarjapur", reraNumber: "PRM/KA/RERA/1251/310/PR/170915/000456", state: "Karnataka", district: "Bengaluru Urban", projectStatus: "Ongoing", completionDate: "2026-12" },
      ],
    },
    {
      name: "Sobha Limited",
      reraNumber: "PRM/KA/RERA/1251/310/PR/170916/000789",
      address: "SOBHA Sarjapur-Marathahalli Outer Ring Road, Devarabisanahalli, Bellandur Post, Bengaluru",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560103",
      contactPerson: "Jagdish Chandra Sharma",
      phones: ["+918049320000"],
      emails: ["webmarketing@sobha.com"],
      projects: [
        { name: "Sobha Neopolis Panathur", reraNumber: "PRM/KA/RERA/1251/310/PR/170916/000789", state: "Karnataka", district: "Bengaluru Urban", projectStatus: "Ongoing", completionDate: "2027-10" },
      ],
    },
    {
      name: "Brigade Enterprises Limited",
      reraNumber: "PRM/KA/RERA/1251/310/PR/170917/000999",
      address: "29th & 30th Floor, World Trade Center, Brigade Gateway Campus, 26/1 Dr. Rajkumar Road, Malleswaram-Rajajinagar, Bengaluru",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560055",
      contactPerson: "Pavitra Shankar",
      phones: ["+918041379200"],
      emails: ["salesenquiry@brigadegroup.com"],
      projects: [
        { name: "Brigade Valencia Electronic City", reraNumber: "PRM/KA/RERA/1251/310/PR/170917/000999", state: "Karnataka", district: "Bengaluru Urban", projectStatus: "Ongoing", completionDate: "2027-06" },
      ],
    },
  ];
}
