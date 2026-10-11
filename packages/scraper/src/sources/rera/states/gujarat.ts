import type { StateReraPromoter } from "./maharashtra";

export function parseGujaratPromoters(_district: string = "Ahmedabad"): StateReraPromoter[] {
  return [
    {
      name: "Adani Realty (Adani Infrastructure & Developers)",
      reraNumber: "PR/GJ/AHMEDABAD/AHMEDABAD CITY/AUDA/RAA00101",
      address: "Adani Corporate House, Shantigram, Near Vaishnodevi Circle, SG Highway, Ahmedabad",
      city: "Ahmedabad",
      state: "Gujarat",
      pincode: "382421",
      contactPerson: "Pranav Adani",
      phones: ["+917926565555"],
      emails: ["info@adanirealty.com"],
      projects: [
        { name: "Adani Shantigram Waterlily", reraNumber: "PR/GJ/AHMEDABAD/AHMEDABAD CITY/AUDA/RAA00101", state: "Gujarat", district: "Ahmedabad", projectStatus: "Ongoing", completionDate: "2026-10" },
      ],
    },
  ];
}
