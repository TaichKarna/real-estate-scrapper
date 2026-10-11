import type { StateReraPromoter } from "./maharashtra";

export function parseTelanganaPromoters(_district: string = "Hyderabad"): StateReraPromoter[] {
  return [
    {
      name: "My Home Constructions Pvt Ltd",
      reraNumber: "P02400003110",
      address: "My Home Hub, 8th Floor, Block-3, Madhapur, Hitec City, Hyderabad",
      city: "Hyderabad",
      state: "Telangana",
      pincode: "500081",
      contactPerson: "Jupally Rameswar Rao",
      phones: ["+914066888888"],
      emails: ["info@myhomeconstructions.com"],
      projects: [
        { name: "My Home Sayuk Gachibowli", reraNumber: "P02400003110", state: "Telangana", district: "Hyderabad", projectStatus: "Ongoing", completionDate: "2026-11" },
        { name: "My Home Aksha Tellapur", reraNumber: "P02400004221", state: "Telangana", district: "Sangareddy", projectStatus: "Ongoing", completionDate: "2027-08" },
      ],
    },
    {
      name: "Aparna Constructions and Estates Private Limited",
      reraNumber: "P02400001550",
      address: "#802, Astral Heights, Road No.1, Banjara Hills, Hyderabad",
      city: "Hyderabad",
      state: "Telangana",
      pincode: "500034",
      contactPerson: "S.S. Reddy",
      phones: ["+914023352708"],
      emails: ["sales@aparnaconstructions.com"],
      projects: [
        { name: "Aparna Zenon Nanakramguda", reraNumber: "P02400001550", state: "Telangana", district: "Rangareddy", projectStatus: "Ongoing", completionDate: "2027-04" },
      ],
    },
  ];
}
