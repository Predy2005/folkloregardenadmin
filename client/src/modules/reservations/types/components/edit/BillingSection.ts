import type { Ref, Dispatch, SetStateAction } from "react";
import type { Contact, Partner } from "@shared/types";
import type { SharedContact } from "@modules/reservations/types";
import type { CompanySearchResult } from "@modules/contacts/utils/companySearch";

export interface BillingSectionProps {
  readonly sharedContact: SharedContact;
  readonly setSharedContact: Dispatch<SetStateAction<SharedContact>>;
  // Company search
  readonly companyQuery: string;
  readonly setCompanyQuery: (value: string) => void;
  readonly companyResults: readonly CompanySearchResult[];
  readonly isCompanyDropdownOpen: boolean;
  readonly setIsCompanyDropdownOpen: (value: boolean) => void;
  readonly isCompanySearching: boolean;
  readonly companyBoxRef: Ref<HTMLDivElement>;
  readonly applyCompanyToForm: (company: CompanySearchResult) => void;
  // Linked contact (edit mode)
  readonly linkedContact?: Contact;
  readonly applyContactBillingToForm?: (contact: Contact) => void;
  // Detected partner
  readonly detectedPartner?: Partner | null;
  readonly applyPartnerBillingToForm?: (partner: Partner) => void;
  // Auto-invoice (create mode only)
  readonly isEdit: boolean;
  readonly autoCreateInvoice: boolean;
  readonly setAutoCreateInvoice: (value: boolean) => void;
  readonly autoInvoiceType: "DEPOSIT" | "FINAL";
  readonly setAutoInvoiceType: (value: "DEPOSIT" | "FINAL") => void;
  readonly autoInvoicePercent: number;
  readonly setAutoInvoicePercent: (value: number) => void;
}
