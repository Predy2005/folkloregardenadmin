import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { api } from "@/shared/lib/api";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { useInvoiceMutations } from "./useInvoiceMutations";
import { useReservationData } from "./useReservationData";
import { useReservationPersons } from "./useReservationPersons";
import { useReservationTransfers } from "./useReservationTransfers";
import { useReservationSubmit } from "./useReservationSubmit";
import type {
  Partner,
  Contact,
} from "@shared/types";
import dayjs from "dayjs";
import {
  smartCompanySearch,
  parseCompanyData,
  type CompanySearchResult,
} from "@modules/contacts/utils/companySearch";
import type { TransferEntry, ReservationEntry, SharedContact } from "@modules/reservations/types";

const defaultSharedContact: SharedContact = {
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  contactNationality: "Česká republika",
  clientComeFrom: "",
  currency: "CZK",
  invoiceSameAsContact: true,
  invoiceName: "",
  invoiceCompany: "",
  invoiceIc: "",
  invoiceDic: "",
  invoiceEmail: "",
  invoicePhone: "",
};

const defaultReservation: ReservationEntry = {
  date: "",
  persons: [],
  status: "RECEIVED",
  contactNote: "",
  transfers: [],
  reservationTypeId: undefined,
};

export function useReservationForm() {
  const [, navigate] = useLocation();
  const [isEditMatch, params] = useRoute("/reservations/:id/edit");
  const isEdit = !!isEditMatch;
  const reservationId = params?.id ? Number(params.id) : null;

  // Get contactId from URL query params for prefilling
  const searchParams = new URLSearchParams(window.location.search);
  const contactIdParam = searchParams.get("contactId");
  const contactId = contactIdParam ? Number(contactIdParam) : null;

  // Multi-reservation state
  const [reservations, setReservations] = useState<ReservationEntry[]>([{ ...defaultReservation }]);
  const [sharedContact, setSharedContact] = useState<SharedContact>({ ...defaultSharedContact });
  const [activeTabIndex, setActiveTabIndex] = useState(0);

  // Contact autocomplete
  const [contactQuery, setContactQuery] = useState("");
  const [isContactDropdownOpen, setIsContactDropdownOpen] = useState(false);
  const contactBoxRef = useRef<HTMLDivElement | null>(null);

  // Company search autocomplete
  const [companyQuery, setCompanyQuery] = useState("");
  const [companyResults, setCompanyResults] = useState<CompanySearchResult[]>([]);
  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false);
  const [isCompanySearching, setIsCompanySearching] = useState(false);
  const companyBoxRef = useRef<HTMLDivElement | null>(null);

  // Invoice create dialog state
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [invoiceDialogType, setInvoiceDialogType] = useState<"DEPOSIT" | "FINAL">("DEPOSIT");
  const [invoiceDialogPercent, setInvoiceDialogPercent] = useState(25);

  // Auto-create invoice options (for create mode)
  const [autoCreateInvoice, setAutoCreateInvoice] = useState(false);
  const [autoInvoiceType, setAutoInvoiceType] = useState<"DEPOSIT" | "FINAL">("DEPOSIT");
  const [autoInvoicePercent, setAutoInvoicePercent] = useState(25);

  // Partner detection state
  const [detectedPartner, setDetectedPartner] = useState<Partner | null>(null);
  const [partnerId, setPartnerId] = useState<number | null>(null);
  const debouncedContactEmail = useDebounce(sharedContact.contactEmail, 500);
  const debouncedContactName = useDebounce(sharedContact.contactName, 500);
  const debouncedCompanyQuery = useDebounce(companyQuery, 300);

  // ── Data queries ──
  const data = useReservationData({
    isEdit,
    reservationId,
    contactQuery,
    contactId,
    linkedContactEmail: isEdit ? sharedContact.contactEmail : undefined,
  });

  // ── Reservation helpers ──
  const updateReservation = (index: number, updates: Partial<ReservationEntry>) => {
    setReservations(prev => prev.map((r, i) => i === index ? { ...r, ...updates } : r));
  };

  const addReservation = () => {
    setReservations(prev => [...prev, { ...defaultReservation }]);
    setActiveTabIndex(reservations.length);
  };

  const removeReservation = (index: number) => {
    if (reservations.length <= 1) return;
    setReservations(prev => prev.filter((_, i) => i !== index));
    if (activeTabIndex >= reservations.length - 1) {
      setActiveTabIndex(Math.max(0, reservations.length - 2));
    }
  };

  // ── Person management ──
  const persons = useReservationPersons({
    reservations,
    updateReservation,
    foods: data.foods,
    pricing: data.pricing,
  });

  // ── Transfer management ──
  const transfers = useReservationTransfers({
    reservations,
    activeTabIndex,
    updateReservation,
  });

  // ── Submit management ──
  const submit = useReservationSubmit({
    isEdit,
    reservationId,
    reservations,
    sharedContact,
    partnerId,
    navigate,
    autoCreateInvoice,
    autoInvoiceType,
    autoInvoicePercent,
  });

  // ── Invoice mutations ──
  const {
    markPaidMutation,
    markInvoicePaidMutation,
    isAnyPending: isAnyInvoiceMutationPending,
    invalidateAll: invalidateInvoices,
  } = useInvoiceMutations(reservationId);

  // ── Click outside handler for dropdowns ──
  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (contactBoxRef.current && !contactBoxRef.current.contains(e.target as Node)) {
        setIsContactDropdownOpen(false);
      }
      if (companyBoxRef.current && !companyBoxRef.current.contains(e.target as Node)) {
        setIsCompanyDropdownOpen(false);
      }
      if (transfers.addressBoxRef.current && !transfers.addressBoxRef.current.contains(e.target as Node)) {
        transfers.setIsAddressDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [transfers]);

  // ── Company search handler with debounce ──
  useEffect(() => {
    if (debouncedCompanyQuery.length < 2) {
      setCompanyResults([]);
      return;
    }
    let cancelled = false;
    setIsCompanySearching(true);
    smartCompanySearch(debouncedCompanyQuery)
      .then(result => { if (!cancelled) setCompanyResults(result.results); })
      .catch(() => { if (!cancelled) setCompanyResults([]); })
      .finally(() => { if (!cancelled) setIsCompanySearching(false); });
    return () => { cancelled = true; };
  }, [debouncedCompanyQuery]);

  // ── Apply selected company to invoice fields ──
  const applyCompanyToForm = (company: CompanySearchResult) => {
    const parsed = parseCompanyData(company);
    setSharedContact(prev => ({
      ...prev,
      invoiceSameAsContact: false,
      invoiceCompany: parsed.name,
      invoiceIc: parsed.ico,
      invoiceDic: parsed.dic || "",
    }));
    setCompanyQuery("");
    setIsCompanyDropdownOpen(false);
  };

  // ── Load existing reservation for edit mode ──
  useEffect(() => {
    if (isEdit && data.reservation) {
      const reservation = data.reservation;
      setSharedContact({
        contactName: reservation.contactName,
        contactEmail: reservation.contactEmail,
        contactPhone: reservation.contactPhone,
        contactNationality: reservation.contactNationality,
        clientComeFrom: reservation.clientComeFrom || "",
        currency: reservation.currency || "CZK",
        invoiceSameAsContact: reservation.invoiceSameAsContact,
        invoiceName: reservation.invoiceName || "",
        invoiceCompany: reservation.invoiceCompany || "",
        invoiceIc: reservation.invoiceIc || "",
        invoiceDic: reservation.invoiceDic || "",
        invoiceEmail: reservation.invoiceEmail || "",
        invoicePhone: reservation.invoicePhone || "",
      });
      let loadedTransfers: TransferEntry[] = [];
      if (reservation?.transfers && reservation.transfers.length > 0) {
        loadedTransfers = reservation.transfers.map((t: { personCount?: number; address?: string; transportCompanyId?: number | null; transportVehicleId?: number | null; transportDriverId?: number | null }) => ({
          personCount: t.personCount || 1,
          address: t.address || "",
          transportCompanyId: t.transportCompanyId || null,
          transportVehicleId: t.transportVehicleId || null,
          transportDriverId: t.transportDriverId || null,
        }));
      } else if (reservation.transferSelected && reservation.transferAddress) {
        loadedTransfers = [{
          personCount: reservation.transferCount || 1,
          address: reservation.transferAddress || "",
        }];
      }

      setReservations([{
        date: dayjs(reservation.date).format("YYYY-MM-DD"),
        persons: reservation.persons?.map(p => ({
          type: p.type,
          menu: p.menu,
          price: Number(p.price),
          nationality: p.nationality || "",
          drinkOption: p.drinkOption || "none",
          drinkName: p.drinkName || "",
          drinkPrice: Number(p.drinkPrice || 0),
          drinkItemId: p.drinkItemId ?? null,
        })) || [],
        status: reservation.status,
        contactNote: reservation.contactNote || "",
        transfers: loadedTransfers,
        reservationTypeId: reservation.reservationTypeId,
      }]);
    }
  }, [isEdit, data.reservation]);

  // ── Prefill contact from URL param (for new reservations) ──
  useEffect(() => {
    if (!isEdit && data.prefillContact) {
      const c = data.prefillContact;
      setSharedContact(prev => ({
        ...prev,
        contactName: c.name || prev.contactName,
        contactEmail: c.email || prev.contactEmail,
        contactPhone: c.phone || prev.contactPhone,
        invoiceSameAsContact: !(c.invoiceName || c.company || c.invoiceIc),
        invoiceName: c.invoiceName || prev.invoiceName,
        invoiceCompany: c.company || prev.invoiceCompany,
        invoiceIc: c.invoiceIc || prev.invoiceIc,
        invoiceDic: c.invoiceDic || prev.invoiceDic,
        invoiceEmail: c.invoiceEmail || prev.invoiceEmail,
        invoicePhone: c.invoicePhone || prev.invoicePhone,
        clientComeFrom: c.clientComeFrom || prev.clientComeFrom,
      }));
    }
  }, [isEdit, data.prefillContact]);

  // ── Apply contact from search to form ──
  const applyContactToForm = (c: Contact) => {
    setSharedContact(prev => ({
      ...prev,
      contactName: c?.name || prev.contactName,
      contactEmail: c?.email || prev.contactEmail,
      contactPhone: c?.phone || prev.contactPhone,
      invoiceSameAsContact: !(c?.invoiceName || c?.company || c?.invoiceIc),
      invoiceName: c?.invoiceName || prev.invoiceName,
      invoiceCompany: c?.company || prev.invoiceCompany,
      invoiceIc: c?.invoiceIc || prev.invoiceIc,
      invoiceDic: c?.invoiceDic || prev.invoiceDic,
      invoiceEmail: c?.invoiceEmail || prev.invoiceEmail,
      invoicePhone: c?.invoicePhone || prev.invoicePhone,
    }));
  };

  // ── Apply only billing/invoice fields from a contact (overwrite, used by button) ──
  const applyContactBillingToForm = (c: Contact) => {
    setSharedContact(prev => ({
      ...prev,
      invoiceSameAsContact: false,
      invoiceName: c.invoiceName || c.name || prev.invoiceName,
      invoiceCompany: c.company || prev.invoiceCompany,
      invoiceIc: c.invoiceIc || prev.invoiceIc,
      invoiceDic: c.invoiceDic || prev.invoiceDic,
      invoiceEmail: c.invoiceEmail || c.email || prev.invoiceEmail,
      invoicePhone: c.invoicePhone || c.phone || prev.invoicePhone,
    }));
  };

  // ── Apply only billing/invoice fields from a partner (overwrite, used by button) ──
  const applyPartnerBillingToForm = (p: Partner) => {
    setSharedContact(prev => ({
      ...prev,
      invoiceSameAsContact: false,
      invoiceName: p.contactPerson || prev.invoiceName,
      invoiceCompany: p.invoiceCompany || p.name || prev.invoiceCompany,
      invoiceIc: p.ic || prev.invoiceIc,
      invoiceDic: p.dic || prev.invoiceDic,
      invoiceEmail: p.billingEmail || p.email || prev.invoiceEmail,
      invoicePhone: p.phone || prev.invoicePhone,
    }));
  };

  // ── Auto-prefill billing from linked contact (edit mode, only fills empty fields) ──
  const autoPrefilledRef = useRef(false);
  useEffect(() => {
    if (!isEdit || !data.linkedContact || autoPrefilledRef.current) return;
    const c = data.linkedContact;
    // Only prefill if we have at least one billing field on the contact
    const hasBilling = c.invoiceName || c.company || c.invoiceIc || c.invoiceDic
      || c.invoiceEmail || c.invoicePhone;
    if (!hasBilling) return;
    setSharedContact(prev => {
      // Only fill empty fields — don't overwrite anything the user has already saved
      return {
        ...prev,
        invoiceName: prev.invoiceName || c.invoiceName || c.name || "",
        invoiceCompany: prev.invoiceCompany || c.company || "",
        invoiceIc: prev.invoiceIc || c.invoiceIc || "",
        invoiceDic: prev.invoiceDic || c.invoiceDic || "",
        invoiceEmail: prev.invoiceEmail || c.invoiceEmail || "",
        invoicePhone: prev.invoicePhone || c.invoicePhone || "",
      };
    });
    autoPrefilledRef.current = true;
  }, [isEdit, data.linkedContact]);

  // ── Partner detection effect ──
  useEffect(() => {
    if (!debouncedContactEmail && !debouncedContactName) {
      setDetectedPartner(null);
      return;
    }
    if (
      (!debouncedContactEmail || !debouncedContactEmail.includes("@")) &&
      (!debouncedContactName || debouncedContactName.length < 3)
    ) {
      return;
    }
    let cancelled = false;
    api.post<{ partner: Partner | null }>("/api/partner/detect", {
      email: debouncedContactEmail || undefined,
      name: debouncedContactName || undefined,
    }).then((result) => {
      if (!cancelled) {
        setDetectedPartner(result?.partner || null);
        if (result?.partner) {
          const partner = result.partner;
          setPartnerId(partner.id);
          // Auto-fill billing fields from partner — only fills empty fields,
          // never overwrites anything the user has already entered/saved.
          // Currency is only filled when creating; in edit mode the reservation
          // already has its own saved currency.
          setSharedContact(prev => ({
            ...prev,
            currency: !isEdit && partner.currency ? partner.currency : prev.currency,
            invoiceSameAsContact: prev.invoiceSameAsContact && !(
              partner.invoiceCompany || partner.name || partner.ic
            ) ? prev.invoiceSameAsContact : false,
            invoiceName: prev.invoiceName || partner.contactPerson || "",
            invoiceCompany: prev.invoiceCompany || partner.invoiceCompany || partner.name || "",
            invoiceIc: prev.invoiceIc || partner.ic || "",
            invoiceDic: prev.invoiceDic || partner.dic || "",
            invoiceEmail: prev.invoiceEmail || partner.billingEmail || partner.email || "",
            invoicePhone: prev.invoicePhone || partner.phone || "",
          }));
        }
      }
    }).catch(() => {
      if (!cancelled) setDetectedPartner(null);
    });
    return () => { cancelled = true; };
  }, [debouncedContactEmail, debouncedContactName, isEdit]);

  // ── Apply partner pricing to persons ──
  const applyPartnerPricing = () => {
    if (!detectedPartner) return;
    const partner = detectedPartner;

    if (partner.pricingModel === "DEFAULT") return;

    setReservations(prev => prev.map((res) => {
      return {
        ...res,
        persons: res.persons.map(person => {
          if (partner.pricingModel === "FLAT") {
            const flatPrice =
              person.type === "adult" || person.type === "driver" || person.type === "guide"
                ? parseFloat(String(partner.flatPriceAdult || "0"))
                : person.type === "child"
                  ? parseFloat(String(partner.flatPriceChild || "0"))
                  : parseFloat(String(partner.flatPriceInfant || "0"));
            return { ...person, price: flatPrice };
          }
          if (partner.pricingModel === "CUSTOM" && partner.customMenuPrices) {
            const food = data.foods?.find(f => f.externalId === person.menu || f.name === person.menu);
            if (food) {
              const customPrice = partner.customMenuPrices[String(food.id)];
              if (customPrice != null) {
                return { ...person, price: customPrice };
              }
            }
          }
          return person;
        }),
      };
    }));
  };

  // ── Computed values ──
  const currentReservation = reservations[activeTabIndex] || reservations[0];
  const currentTotalPrice = useMemo(() => {
    return currentReservation?.persons.reduce((sum, p) => sum + (Number(p.price) || 0), 0) || 0;
  }, [currentReservation?.persons]);

  const grandTotalPrice = useMemo(() => {
    return reservations.reduce((total, r) =>
      total + r.persons.reduce((sum, p) => sum + (Number(p.price) || 0), 0), 0
    );
  }, [reservations]);

  return {
    // Route info
    isEdit,
    reservationId,
    navigate,

    // Core state
    reservations,
    setReservations,
    sharedContact,
    setSharedContact,
    activeTabIndex,
    setActiveTabIndex,

    // Bulk state (from persons hook)
    bulkCount: persons.bulkCount, setBulkCount: persons.setBulkCount,
    bulkType: persons.bulkType, setBulkType: persons.setBulkType,
    bulkMenu: persons.bulkMenu, setBulkMenu: persons.setBulkMenu,
    bulkPrice: persons.bulkPrice, setBulkPrice: persons.setBulkPrice,
    bulkNationality: persons.bulkNationality, setBulkNationality: persons.setBulkNationality,
    bulkPriceChange: persons.bulkPriceChange, setBulkPriceChange: persons.setBulkPriceChange,
    bulkMenuChange: persons.bulkMenuChange, setBulkMenuChange: persons.setBulkMenuChange,
    bulkDrinkChange: persons.bulkDrinkChange, setBulkDrinkChange: persons.setBulkDrinkChange,

    // Submit state (from submit hook)
    isSubmitting: submit.isSubmitting,
    submitProgress: submit.submitProgress,
    submitResults: submit.submitResults,

    // Contact autocomplete
    contactQuery, setContactQuery,
    isContactDropdownOpen, setIsContactDropdownOpen,
    contactBoxRef,
    isSearchingContacts: data.isSearchingContacts,
    contactSearchItems: data.contactSearch?.items,

    // Company search
    companyQuery, setCompanyQuery,
    companyResults,
    isCompanyDropdownOpen, setIsCompanyDropdownOpen,
    isCompanySearching,
    companyBoxRef,

    // Address search (from transfers hook)
    addressResults: transfers.addressResults,
    isAddressDropdownOpen: transfers.isAddressDropdownOpen,
    setIsAddressDropdownOpen: transfers.setIsAddressDropdownOpen,
    isAddressSearching: transfers.isAddressSearching,
    activeTransferIndex: transfers.activeTransferIndex,
    setActiveTransferIndex: transfers.setActiveTransferIndex,
    addressBoxRef: transfers.addressBoxRef,

    // Invoice dialog
    invoiceDialogOpen, setInvoiceDialogOpen,
    invoiceDialogType, setInvoiceDialogType,
    invoiceDialogPercent, setInvoiceDialogPercent,

    // Auto invoice
    autoCreateInvoice, setAutoCreateInvoice,
    autoInvoiceType, setAutoInvoiceType,
    autoInvoicePercent, setAutoInvoicePercent,

    // Partner
    detectedPartner,
    partnerId,
    applyPartnerPricing,

    // Data (from data hook)
    foods: data.foods,
    pricing: data.pricing,
    reservationTypes: data.reservationTypes,
    transportCompanies: data.transportCompanies,
    drinks: data.drinks,
    isLoadingReservation: data.isLoadingReservation,
    paymentSummary: data.paymentSummary,
    summaryLoading: data.summaryLoading,
    invoices: data.invoices,
    invoicesLoading: data.invoicesLoading,
    markPaidMutation,
    markInvoicePaidMutation,
    isAnyInvoiceMutationPending,
    invalidateInvoices,

    // Actions
    updateReservation,
    addReservation,
    removeReservation,
    addPerson: persons.addPerson,
    updatePerson: persons.updatePerson,
    addTransfer: transfers.addTransfer,
    updateTransfer: transfers.updateTransfer,
    removeTransfer: transfers.removeTransfer,
    handleTypeChange: persons.handleTypeChange,
    handleMenuChange: persons.handleMenuChange,
    removePerson: persons.removePerson,
    addBulkPersons: persons.addBulkPersons,
    applyBulkPriceChange: persons.applyBulkPriceChange,
    applyBulkMenuChange: persons.applyBulkMenuChange,
    applyBulkDrinkChange: persons.applyBulkDrinkChange,
    applyContactToForm,
    applyContactBillingToForm,
    linkedContact: data.linkedContact,
    applyPartnerBillingToForm,
    applyCompanyToForm,
    handleSubmitSingle: submit.handleSubmitSingle,
    handleSubmitAll: submit.handleSubmitAll,

    // Computed
    currentReservation,
    currentTotalPrice,
    grandTotalPrice,
  };
}
