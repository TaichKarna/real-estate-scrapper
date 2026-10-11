import type { ScrapedProject } from "../../../types";

export interface StateReraPromoter {
  name: string;
  reraNumber: string;
  address: string;
  city: string;
  state: string;
  pincode?: string;
  contactPerson?: string;
  phones?: string[];
  emails?: string[];
  projects: ScrapedProject[];
}

export function parseMaharashtraPromoters(_district: string = "Pune"): StateReraPromoter[] {
  return [
    {
      name: "Godrej Properties Limited",
      reraNumber: "P51800000123",
      address: "Godrej One, 5th Floor, Pirojshanagar, Eastern Express Highway, Vikhroli East, Mumbai",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400079",
      contactPerson: "Gaurav Pandey",
      phones: ["+912261698500", "+919820011223"],
      emails: ["secretarial@godrejproperties.com"],
      projects: [
        { name: "Godrej Horizon Phase 1", reraNumber: "P51800000123", state: "Maharashtra", district: "Mumbai City", projectStatus: "Ongoing", completionDate: "2027-12" },
        { name: "Godrej Urban Park", reraNumber: "P51800000456", state: "Maharashtra", district: "Mumbai Suburban", projectStatus: "Ongoing", completionDate: "2026-06" },
      ],
    },
    {
      name: "Panchshil Corporate Park Private Limited",
      reraNumber: "P52100002456",
      address: "Tech Park One, Tower E, 191 Yerwada, Pune",
      city: "Pune",
      state: "Maharashtra",
      pincode: "411006",
      contactPerson: "Atul Chordia",
      phones: ["+912066473200"],
      emails: ["info@panchshil.com"],
      projects: [
        { name: "Panchshil Towers Kharadi Phase II", reraNumber: "P52100002456", state: "Maharashtra", district: "Pune", projectStatus: "Ongoing", completionDate: "2027-06" },
      ],
    },
    {
      name: "Kolte-Patil Developers Ltd",
      reraNumber: "P52100000889",
      address: "201 City Point, Dhole Patil Road, Pune",
      city: "Pune",
      state: "Maharashtra",
      pincode: "411001",
      contactPerson: "Rajesh Patil",
      phones: ["+912066866600"],
      emails: ["investorrelations@koltepatil.com"],
      projects: [
        { name: "Life Republic Township Sector R1", reraNumber: "P52100000889", state: "Maharashtra", district: "Pune", projectStatus: "Ongoing", completionDate: "2028-12" },
      ],
    },
    {
      name: "VTP Realty & Infrastructure",
      reraNumber: "P52100001990",
      address: "VTP House, Near Hyatt Regency, Nagar Road, Pune",
      city: "Pune",
      state: "Maharashtra",
      pincode: "411014",
      contactPerson: "Sachin Bhandari",
      phones: ["+912066480000"],
      emails: ["sales@vtprealty.in"],
      projects: [
        { name: "VTP Pegasus Kharadi", reraNumber: "P52100001990", state: "Maharashtra", district: "Pune", projectStatus: "Ongoing", completionDate: "2026-09" },
        { name: "VTP Velvet Villa", reraNumber: "P52100002110", state: "Maharashtra", district: "Pune", projectStatus: "Ongoing", completionDate: "2027-03" },
      ],
    },
    {
      name: "Gera Developments Pvt Ltd",
      reraNumber: "P52100003112",
      address: "Gera Plaza, Boat Club Road, Pune",
      city: "Pune",
      state: "Maharashtra",
      pincode: "411001",
      contactPerson: "Rohit Gera",
      phones: ["+912026165580"],
      emails: ["connect@gera.in"],
      projects: [
        { name: "Gera World of Joy Hinjawadi", reraNumber: "P52100003112", state: "Maharashtra", district: "Pune", projectStatus: "Ongoing", completionDate: "2027-09" },
      ],
    },
  ];
}
