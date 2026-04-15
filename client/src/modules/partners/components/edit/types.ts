import { z } from "zod";

export const partnerSchema = z.object({
  name: z.string().min(1, "Zadejte nazev partnera"),
  partnerType: z.enum(["HOTEL", "RECEPTION", "DISTRIBUTOR", "OTHER"]),
  contactPerson: z.string().optional(),
  email: z.string().email("Zadejte platny email").or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  ic: z.string().optional(),
  dic: z.string().optional(),
  bankAccount: z.string().optional(),
  currency: z.string().min(3).max(3).default("CZK"),
  isActive: z.boolean().default(true),
  notes: z.string().optional(),
  pricingModel: z.enum(["DEFAULT", "CUSTOM", "FLAT"]),
  flatPriceAdult: z.string().nullable().optional(),
  flatPriceChild: z.string().nullable().optional(),
  flatPriceInfant: z.string().nullable().optional(),
  customMenuPrices: z.record(z.string(), z.number()).nullable().optional(),
  billingPeriod: z.enum(["PER_RESERVATION", "MONTHLY", "QUARTERLY"]),
  billingEmail: z.string().optional(),
  invoiceCompany: z.string().optional(),
  invoiceStreet: z.string().optional(),
  invoiceCity: z.string().optional(),
  invoiceZipcode: z.string().optional(),
  commissionRate: z.string(),
  detectionEmails: z.string().optional(),
  detectionKeywords: z.string().optional(),
});

export type PartnerForm = z.infer<typeof partnerSchema>;

export const PARTNER_TYPE_LABELS: Record<string, string> = {
  HOTEL: "Hotel",
  RECEPTION: "Recepce",
  DISTRIBUTOR: "Distributor",
  OTHER: "Ostatni",
};
