import type { StateReraPromoter } from "./maharashtra";

export function parseUPPromoters(_district: string = "Noida"): StateReraPromoter[] {
  return [
    {
      name: "Gaurs Group (Gaursons India Pvt Ltd)",
      reraNumber: "UPRERAPRJ6682",
      address: "Gaur Biz Park, Plot No 1, Abhay Khand II, Indirapuram, Ghaziabad",
      city: "Noida",
      state: "Uttar Pradesh",
      pincode: "201014",
      contactPerson: "Manoj Gaur",
      phones: ["+911204343333"],
      emails: ["info@gaursonsindia.com"],
      projects: [
        { name: "Gaur NYC Residences", reraNumber: "UPRERAPRJ6682", state: "Uttar Pradesh", district: "Gautam Buddha Nagar", projectStatus: "Ongoing", completionDate: "2028-06" },
      ],
    },
    {
      name: "M3M India Private Limited",
      reraNumber: "UPRERAPRJ1234",
      address: "M3M Tee Point, Golf Course Extension Road, Sector 65, Gurugram / Noida Office",
      city: "Noida",
      state: "Uttar Pradesh",
      pincode: "201301",
      contactPerson: "Pankaj Bansal",
      phones: ["+911244717777"],
      emails: ["sales@m3mindia.com"],
      projects: [
        { name: "M3M The Line Sector 72", reraNumber: "UPRERAPRJ1234", state: "Uttar Pradesh", district: "Gautam Buddha Nagar", projectStatus: "Ongoing", completionDate: "2027-12" },
      ],
    },
  ];
}
