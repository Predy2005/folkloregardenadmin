import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { invalidateReservationQueries, invalidateInvoiceQueries } from "@/shared/lib/query-helpers";
import { formatCurrency } from "@/shared/lib/formatting";
import { successToast, errorToast } from "@/shared/lib/toast-helpers";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { useInvoiceMutations } from "../hooks/useInvoiceMutations";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Label } from "@/shared/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { StatusBadge } from "@/shared/components/StatusBadge";
import type {
  Reservation,
  ReservationFood,
  ReservationType,
  PricingDefault,
  Invoice,
  PaymentSummary,
} from "@shared/types";
import dayjs from "dayjs";
import { Bot, Plus, Trash2 } from "lucide-react";
import {
  isAiConfigured,
  parseMultiReservationWithAI,
  type AiParsedMultiReservation,
  type AiMultiReservationEntry,
} from "@modules/reservations/utils/ai";
import {
  searchCompanies,
  parseCompanyData,
  type CompanySearchResult,
} from "@modules/contacts/utils/companySearch";
import {
  searchAddresses,
  getShortAddress,
  type AddressResult,
} from "@modules/contacts/utils/addressSearch";
import { InvoiceCreateDialog } from "@modules/reservations/components/InvoiceCreateDialog";
import {
  ContactSection,
  BillingSection,
  ReservationPersonsSection,
  PaymentInvoicesSection,
  SubmitProgressCard,
} from "@modules/reservations/components/edit";
import { Receipt } from "lucide-react";
import type { PersonEntry, TransferEntry, ReservationEntry, SharedContact } from "@modules/reservations/types";

const defaultSharedContact: SharedContact = {
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  contactNationality: "Česká republika",
  clientComeFrom: "",
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

export default function ReservationEdit() {
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

  // AI assistant state
  const [aiInput, setAiInput] = useState("");
  const [aiJson, setAiJson] = useState<AiParsedMultiReservation | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Bulk add persons state
  const [bulkCount, setBulkCount] = useState<number>(1);
  const [bulkType, setBulkType] = useState<PersonEntry["type"]>("adult");
  const [bulkMenu, setBulkMenu] = useState<string>("");
  const [bulkPrice, setBulkPrice] = useState<number | "">("");
  const [bulkNationality, setBulkNationality] = useState<string>("");

  // Bulk price change state
  const [bulkPriceChange, setBulkPriceChange] = useState<number | "">("");

  // Bulk menu change state
  const [bulkMenuChange, setBulkMenuChange] = useState<string>("");

  // Submit state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState(0);
  const [submitResults, setSubmitResults] = useState<{ success: boolean; date: string; error?: string }[]>([]);

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

  // Address search autocomplete
  const [addressResults, setAddressResults] = useState<AddressResult[]>([]);
  const [isAddressDropdownOpen, setIsAddressDropdownOpen] = useState(false);
  const [isAddressSearching, setIsAddressSearching] = useState(false);
  const [activeTransferIndex, setActiveTransferIndex] = useState<number | null>(null);
  const addressBoxRef = useRef<HTMLDivElement | null>(null);

  // Debounced search values
  const debouncedCompanyQuery = useDebounce(companyQuery, 300);
  const currentAddress = activeTransferIndex !== null
    ? (reservations[activeTabIndex]?.transfers?.[activeTransferIndex]?.address || "")
    : "";
  const debouncedAddress = useDebounce(currentAddress, 400);

  // Invoice create dialog state
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [invoiceDialogType, setInvoiceDialogType] = useState<"DEPOSIT" | "FINAL">("DEPOSIT");
  const [invoiceDialogPercent, setInvoiceDialogPercent] = useState(25);

  // Auto-create invoice options (for create mode)
  const [autoCreateInvoice, setAutoCreateInvoice] = useState(false);
  const [autoInvoiceType, setAutoInvoiceType] = useState<"DEPOSIT" | "FINAL">("DEPOSIT");
  const [autoInvoicePercent, setAutoInvoicePercent] = useState(25);

  // Data queries
  const { data: foods } = useQuery({
    queryKey: ["/api/reservation-foods"],
    queryFn: () => api.get<ReservationFood[]>("/api/reservation-foods"),
  });

  const { data: pricing } = useQuery<PricingDefault>({
    queryKey: ["/api/pricing/defaults"],
  });

  const { data: reservationTypes } = useQuery({
    queryKey: ["/api/reservation-types"],
    queryFn: () => api.get<ReservationType[]>("/api/reservation-types"),
  });

  const { data: reservation, isLoading: isLoadingReservation } = useQuery({
    enabled: isEdit && !!reservationId,
    queryKey: ["/api/reservations", reservationId],
    queryFn: () => api.get<Reservation>(`/api/reservations/${reservationId}`),
  });

  const { data: contactSearch, isFetching: isSearchingContacts } = useQuery({
    queryKey: ["/api/contacts", contactQuery],
    enabled: contactQuery.trim().length >= 2,
    queryFn: () =>
      api.get<{ items: any[]; total: number }>(
        `/api/contacts?q=${encodeURIComponent(contactQuery)}&limit=10`
      ),
  });

  // Query for prefilling contact from URL param
  const { data: prefillContact } = useQuery({
    queryKey: ["/api/contacts", contactId],
    enabled: !isEdit && !!contactId,
    queryFn: () => api.get<any>(`/api/contacts/${contactId}`),
  });

  // Invoice queries (only for edit mode)
  const { data: paymentSummary, isLoading: summaryLoading } = useQuery({
    queryKey: ["/api/reservations", reservationId, "payment-summary"],
    queryFn: () => api.get<PaymentSummary>(`/api/reservations/${reservationId}/payment-summary`),
    enabled: isEdit && !!reservationId,
  });

  const { data: invoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ["/api/invoices/reservation", reservationId],
    queryFn: () => api.get<Invoice[]>(`/api/invoices/reservation/${reservationId}`),
    enabled: isEdit && !!reservationId,
  });

  const {
    createDepositMutation,
    createFinalMutation,
    markPaidMutation,
    markInvoicePaidMutation,
    isAnyPending: isAnyInvoiceMutationPending,
    invalidateAll: invalidateInvoices,
  } = useInvoiceMutations(reservationId);

  // Click outside handler for dropdowns
  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (contactBoxRef.current && !contactBoxRef.current.contains(e.target as Node)) {
        setIsContactDropdownOpen(false);
      }
      if (companyBoxRef.current && !companyBoxRef.current.contains(e.target as Node)) {
        setIsCompanyDropdownOpen(false);
      }
      if (addressBoxRef.current && !addressBoxRef.current.contains(e.target as Node)) {
        setIsAddressDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  // Company search handler with debounce
  useEffect(() => {
    if (debouncedCompanyQuery.length < 2) {
      setCompanyResults([]);
      return;
    }
    let cancelled = false;
    setIsCompanySearching(true);
    searchCompanies(debouncedCompanyQuery)
      .then(results => { if (!cancelled) setCompanyResults(results); })
      .catch(() => { if (!cancelled) setCompanyResults([]); })
      .finally(() => { if (!cancelled) setIsCompanySearching(false); });
    return () => { cancelled = true; };
  }, [debouncedCompanyQuery]);

  // Address search handler with debounce
  useEffect(() => {
    if (activeTransferIndex === null || debouncedAddress.length < 3 || !isAddressDropdownOpen) {
      setAddressResults([]);
      return;
    }
    let cancelled = false;
    setIsAddressSearching(true);
    searchAddresses(debouncedAddress)
      .then(results => { if (!cancelled) setAddressResults(results); })
      .catch(() => { if (!cancelled) setAddressResults([]); })
      .finally(() => { if (!cancelled) setIsAddressSearching(false); });
    return () => { cancelled = true; };
  }, [debouncedAddress, activeTransferIndex, isAddressDropdownOpen]);

  // Apply selected company to invoice fields
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

  // Load existing reservation for edit mode
  useEffect(() => {
    if (isEdit && reservation) {
      setSharedContact({
        contactName: reservation.contactName,
        contactEmail: reservation.contactEmail,
        contactPhone: reservation.contactPhone,
        contactNationality: reservation.contactNationality,
        clientComeFrom: reservation.clientComeFrom || "",
        invoiceSameAsContact: reservation.invoiceSameAsContact,
        invoiceName: reservation.invoiceName || "",
        invoiceCompany: reservation.invoiceCompany || "",
        invoiceIc: reservation.invoiceIc || "",
        invoiceDic: reservation.invoiceDic || "",
        invoiceEmail: reservation.invoiceEmail || "",
        invoicePhone: reservation.invoicePhone || "",
      });
      // Convert old single transfer format to new array format if needed
      let transfers: TransferEntry[] = [];
      if (reservation?.transfers && reservation.transfers.length > 0) {
        transfers = reservation.transfers.map((t: any) => ({
          personCount: t.personCount || 1,
          address: t.address || "",
        }));
      } else if (reservation.transferSelected && reservation.transferAddress) {
        // Backwards compatibility: convert old single transfer to array
        transfers = [{
          personCount: reservation.transferCount || 1,
          address: reservation.transferAddress || "",
        }];
      }

      setReservations([{
        date: dayjs(reservation.date).format("YYYY-MM-DD"),
        persons: reservation.persons?.map(p => ({
          type: p.type,
          menu: p.menu,
          price: p.price,
          nationality: p.nationality || "",
        })) || [],
        status: reservation.status,
        contactNote: reservation.contactNote || "",
        transfers,
        reservationTypeId: reservation.reservationTypeId,
      }]);
    }
  }, [isEdit, reservation]);

  // Prefill contact from URL param (for new reservations)
  useEffect(() => {
    if (!isEdit && prefillContact) {
      setSharedContact(prev => ({
        ...prev,
        contactName: prefillContact.name || prev.contactName,
        contactEmail: prefillContact.email || prev.contactEmail,
        contactPhone: prefillContact.phone || prev.contactPhone,
        invoiceSameAsContact: !(prefillContact.invoiceName || prefillContact.invoiceCompany || prefillContact.invoiceIc),
        invoiceName: prefillContact.invoiceName || prev.invoiceName,
        invoiceCompany: prefillContact.company || prefillContact.invoiceCompany || prev.invoiceCompany,
        invoiceIc: prefillContact.invoiceIc || prev.invoiceIc,
        invoiceDic: prefillContact.invoiceDic || prev.invoiceDic,
        invoiceEmail: prefillContact.invoiceEmail || prev.invoiceEmail,
        invoicePhone: prefillContact.invoicePhone || prev.invoicePhone,
        clientComeFrom: prefillContact.clientComeFrom || prev.clientComeFrom,
      }));
    }
  }, [isEdit, prefillContact]);

  // Helper functions
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

  const addPerson = (resIndex: number, type: PersonEntry["type"], nationality: string = "") => {
    const defaultPrice =
      type === "adult" ? pricing?.adultPrice || 1250 :
      type === "child" ? pricing?.childPrice || 800 :
      0;

    const menu = (type === "infant" || type === "driver" || type === "guide") ? "Bez jídla" : "";

    updateReservation(resIndex, {
      persons: [...reservations[resIndex].persons, { type, menu, price: defaultPrice, nationality }],
    });
  };

  const updatePerson = (resIndex: number, personIndex: number, updates: Partial<PersonEntry>) => {
    const newPersons = [...reservations[resIndex].persons];
    newPersons[personIndex] = { ...newPersons[personIndex], ...updates };
    updateReservation(resIndex, { persons: newPersons });
  };

  // Transfer helpers
  const addTransfer = (resIndex: number) => {
    const newTransfers = [...reservations[resIndex].transfers, { personCount: 1, address: "" }];
    updateReservation(resIndex, { transfers: newTransfers });
  };

  const updateTransfer = (resIndex: number, transferIndex: number, updates: Partial<TransferEntry>) => {
    const newTransfers = [...reservations[resIndex].transfers];
    newTransfers[transferIndex] = { ...newTransfers[transferIndex], ...updates };
    updateReservation(resIndex, { transfers: newTransfers });
  };

  const removeTransfer = (resIndex: number, transferIndex: number) => {
    const newTransfers = reservations[resIndex].transfers.filter((_, i) => i !== transferIndex);
    updateReservation(resIndex, { transfers: newTransfers });
    // Reset active transfer index if needed
    if (activeTransferIndex === transferIndex) {
      setActiveTransferIndex(null);
      setIsAddressDropdownOpen(false);
    } else if (activeTransferIndex !== null && activeTransferIndex > transferIndex) {
      setActiveTransferIndex(activeTransferIndex - 1);
    }
  };

  // Handler pro změnu typu osoby - automaticky upraví menu a cenu
  const handleTypeChange = (resIndex: number, personIndex: number, newType: PersonEntry["type"]) => {
    const isFreeType = newType === "driver" || newType === "guide" || newType === "infant";

    if (isFreeType) {
      // Řidič, průvodce, batole = bez jídla a cena 0
      updatePerson(resIndex, personIndex, {
        type: newType,
        menu: "Bez jídla",
        price: 0,
      });
    } else {
      // Dospělý nebo dítě - nastavit výchozí cenu pokud byla 0
      const person = reservations[resIndex].persons[personIndex];
      const defaultPrice = newType === "adult"
        ? pricing?.adultPrice || 1250
        : pricing?.childPrice || 800;

      updatePerson(resIndex, personIndex, {
        type: newType,
        // Pokud byla cena 0 (z řidiče/průvodce), nastavit výchozí
        price: person.price === 0 ? defaultPrice : person.price,
        // Pokud bylo "Bez jídla", vymazat menu
        menu: person.menu === "Bez jídla" ? "" : person.menu,
      });
    }
  };

  // Helper: najde jídlo podle externalId nebo name
  const findFoodByValue = (value: string): ReservationFood | undefined => {
    if (!foods) return undefined;
    return foods.find(f => f.externalId === value || f.name === value);
  };

  // Změna menu s automatickým přičtením/odečtením příplatku
  const handleMenuChange = (resIndex: number, personIndex: number, newMenuValue: string) => {
    const person = reservations[resIndex].persons[personIndex];
    const oldFood = findFoodByValue(person.menu);
    const newFood = findFoodByValue(newMenuValue);

    const oldSurcharge = oldFood?.surcharge ?? 0;
    const newSurcharge = newFood?.surcharge ?? 0;

    // Upravit cenu: odečíst starý příplatek, přičíst nový
    const newPrice = person.price - oldSurcharge + newSurcharge;

    updatePerson(resIndex, personIndex, {
      menu: newMenuValue,
      price: Math.max(0, newPrice), // zajistit nezápornou cenu
    });
  };

  const removePerson = (resIndex: number, personIndex: number) => {
    updateReservation(resIndex, {
      persons: reservations[resIndex].persons.filter((_, i) => i !== personIndex),
    });
  };

  const addBulkPersons = (resIndex: number) => {
    const count = Number(bulkCount || 0);
    if (!Number.isFinite(count) || count <= 0) {
      errorToast("Zadejte platný počet osob");
      return;
    }

    const isMenuDisabled = bulkType === "infant" || bulkType === "driver" || bulkType === "guide";
    const menuValue = isMenuDisabled ? "Bez jídla" : bulkMenu || "";

    // Najít příplatek pro vybrané menu
    const selectedFood = findFoodByValue(menuValue);
    const surcharge = selectedFood?.surcharge ?? 0;

    const derivedPrice = () => {
      if (bulkPrice !== "" && Number.isFinite(Number(bulkPrice))) return Number(bulkPrice);
      const basePrice = bulkType === "adult" ? Number(pricing?.adultPrice ?? 1250)
        : bulkType === "child" ? Number(pricing?.childPrice ?? 800)
        : 0;
      // Přidat příplatek k základní ceně
      return basePrice + surcharge;
    };

    const pricePerPerson = derivedPrice();

    const newPersons: PersonEntry[] = Array.from({ length: count }).map(() => ({
      type: bulkType,
      menu: menuValue,
      price: pricePerPerson,
      nationality: bulkNationality,
    }));

    updateReservation(resIndex, {
      persons: [...reservations[resIndex].persons, ...newPersons],
    });
    setBulkCount(1);
    setBulkNationality("");
  };

  const applyBulkPriceChange = (resIndex: number) => {
    const newPrice = Number(bulkPriceChange);
    if (!Number.isFinite(newPrice) || newPrice < 0) {
      errorToast("Zadejte platnou cenu");
      return;
    }
    // Apply to all paying persons (adult, child)
    const updatedPersons = reservations[resIndex].persons.map(p =>
      (p.type === "adult" || p.type === "child") ? { ...p, price: newPrice } : p
    );
    updateReservation(resIndex, { persons: updatedPersons });
    setBulkPriceChange("");
    const affectedCount = reservations[resIndex].persons.filter(p => p.type === "adult" || p.type === "child").length;
    successToast(`Cena změněna u ${affectedCount} platících osob`);
  };

  const applyBulkMenuChange = (resIndex: number) => {
    if (!bulkMenuChange) {
      errorToast("Vyberte menu");
      return;
    }
    const newFood = findFoodByValue(bulkMenuChange);
    const newSurcharge = newFood?.surcharge ?? 0;

    // Apply to all persons who can have menu (adult, child) - not infant, driver, guide
    // Also adjust price based on surcharge difference
    const updatedPersons = reservations[resIndex].persons.map(p => {
      if (p.type !== "adult" && p.type !== "child") return p;

      const oldFood = findFoodByValue(p.menu);
      const oldSurcharge = oldFood?.surcharge ?? 0;
      const newPrice = Math.max(0, p.price - oldSurcharge + newSurcharge);

      return { ...p, menu: bulkMenuChange, price: newPrice };
    });
    updateReservation(resIndex, { persons: updatedPersons });
    setBulkMenuChange("");
    const affectedCount = reservations[resIndex].persons.filter(p => p.type === "adult" || p.type === "child").length;
    successToast(`Menu změněno u ${affectedCount} osob`);
  };

  const applyContactToForm = (c: any) => {
    setSharedContact(prev => ({
      ...prev,
      contactName: c?.name || prev.contactName,
      contactEmail: c?.email || prev.contactEmail,
      contactPhone: c?.phone || prev.contactPhone,
      invoiceSameAsContact: !(c?.invoiceName || c?.invoiceCompany || c?.invoiceIc),
      invoiceName: c?.invoiceName || prev.invoiceName,
      invoiceCompany: c?.company || c?.invoiceCompany || prev.invoiceCompany,
      invoiceIc: c?.invoiceIc || prev.invoiceIc,
      invoiceDic: c?.invoiceDic || prev.invoiceDic,
      invoiceEmail: c?.invoiceEmail || prev.invoiceEmail,
      invoicePhone: c?.invoicePhone || prev.invoicePhone,
    }));
  };

  // AI handlers
  const handleAiAnalyze = async () => {
    setAiError(null);
    setAiJson(null);
    if (!isAiConfigured()) {
      setAiError("AI není nakonfigurováno. Nastavte VITE_AI_BASE_URL v .env.");
      return;
    }
    setAiLoading(true);
    try {
      const result = await parseMultiReservationWithAI({ text: aiInput });
      setAiJson(result);
    } catch (e: any) {
      setAiError(e?.message || "Chyba při volání AI");
    } finally {
      setAiLoading(false);
    }
  };

  const handleAiApply = () => {
    if (!aiJson) return;

    try {
      // Apply shared contact
      setSharedContact(prev => ({
        ...prev,
        contactName: aiJson.contact.name || prev.contactName,
        contactEmail: aiJson.contact.email || prev.contactEmail,
        contactPhone: aiJson.contact.phone || prev.contactPhone,
        contactNationality: aiJson.contact.nationality || prev.contactNationality,
        invoiceSameAsContact: !(aiJson.contact.invoiceCompany || aiJson.contact.invoiceIc),
        invoiceName: aiJson.contact.invoiceName || prev.invoiceName,
        invoiceCompany: aiJson.contact.invoiceCompany || aiJson.contact.company || prev.invoiceCompany,
        invoiceIc: aiJson.contact.invoiceIc || prev.invoiceIc,
        invoiceDic: aiJson.contact.invoiceDic || prev.invoiceDic,
        invoiceEmail: aiJson.contact.invoiceEmail || prev.invoiceEmail,
        invoicePhone: aiJson.contact.invoicePhone || prev.invoicePhone,
      }));

      // Helper to find best matching menu from available foods
      // Handles both English (from email) and Czech (from system) menu names
      const findMenuMatch = (menuText: string | undefined): string => {
        const defaultMenu = foods?.find(f =>
          f.name.toLowerCase().includes("traditional") || f.name.toLowerCase().includes("tradiční")
        )?.name || foods?.[0]?.name || "Traditional";

        if (!menuText || !foods?.length) return defaultMenu;

        const lowerMenu = menuText.toLowerCase();
        const lowerFoodName = (f: ReservationFood) => f.name.toLowerCase();

        // Try exact match first
        const exactMatch = foods.find(f => lowerFoodName(f) === lowerMenu);
        if (exactMatch) return exactMatch.name;

        // Chicken halal (EN: "chicken halal", CZ: "kuřecí halal")
        if (lowerMenu.includes("chicken") && lowerMenu.includes("halal")) {
          const match = foods.find(f =>
            (lowerFoodName(f).includes("chicken") || lowerFoodName(f).includes("kuřec")) &&
            lowerFoodName(f).includes("halal")
          );
          if (match) return match.name;
        }

        // Regular chicken (EN: "chicken", CZ: "kuřecí")
        if (lowerMenu.includes("chicken") && !lowerMenu.includes("halal")) {
          // Prefer non-halal chicken if available
          const nonHalalMatch = foods.find(f =>
            (lowerFoodName(f).includes("chicken") || lowerFoodName(f).includes("kuřec")) &&
            !lowerFoodName(f).includes("halal")
          );
          if (nonHalalMatch) return nonHalalMatch.name;
          // Otherwise any chicken
          const anyChicken = foods.find(f =>
            lowerFoodName(f).includes("chicken") || lowerFoodName(f).includes("kuřec")
          );
          if (anyChicken) return anyChicken.name;
        }

        // Vegetarian/Vegan (EN & CZ variations)
        if (lowerMenu.includes("vegetarian") || lowerMenu.includes("vegan") ||
            lowerMenu.includes("vegetariánsk") || lowerMenu.includes("veganské")) {
          const match = foods.find(f =>
            lowerFoodName(f).includes("vegetarian") || lowerFoodName(f).includes("vegan") ||
            lowerFoodName(f).includes("vegetariánsk") || lowerFoodName(f).includes("veganské")
          );
          if (match) return match.name;
        }

        // Traditional (EN: "traditional", CZ: "tradiční")
        if (lowerMenu.includes("traditional") || lowerMenu.includes("tradiční")) {
          const match = foods.find(f =>
            lowerFoodName(f).includes("traditional") || lowerFoodName(f).includes("tradiční")
          );
          if (match) return match.name;
        }

        // Fallback to default
        return defaultMenu;
      };

      const defaultAdultPrice = pricing?.adultPrice ?? 1250;
      const defaultChildPrice = pricing?.childPrice ?? 800;

      const newReservations: ReservationEntry[] = aiJson.reservations.map((r: AiMultiReservationEntry) => {
        const persons: PersonEntry[] = [];

        // Determine menu for this group from AI extracted data
        const groupMenu = findMenuMatch(r.menu);

        // Use price from AI if available, otherwise use default
        const adultPrice = r.pricePerPerson ?? defaultAdultPrice;
        // Nationality comes from contact, not individual reservations
        const groupNationality = aiJson.contact?.nationality || "";

        // Add adults with the group's specific menu and price
        for (let i = 0; i < r.adults; i++) {
          persons.push({ type: "adult", menu: groupMenu, price: adultPrice, nationality: groupNationality });
        }

        // Add children (use proportional child price if custom price is set)
        const childMenu = foods?.find(f => f.isChildrenMenu)?.name || "Dětské menu";
        const childPrice = r.pricePerPerson
          ? Math.round(r.pricePerPerson * 0.64) // ~64% of adult price for children
          : defaultChildPrice;
        for (let i = 0; i < r.children; i++) {
          persons.push({ type: "child", menu: childMenu, price: childPrice, nationality: groupNationality });
        }

        // Add infants
        for (let i = 0; i < r.infants; i++) {
          persons.push({ type: "infant", menu: "Bez jídla", price: 0, nationality: groupNationality });
        }

        // Add free tour leaders (guides)
        for (let i = 0; i < r.freeTourLeaders; i++) {
          persons.push({ type: "guide", menu: "Bez jídla", price: 0, nationality: "" });
        }

        // Add free drivers
        for (let i = 0; i < r.freeDrivers; i++) {
          persons.push({ type: "driver", menu: "Bez jídla", price: 0, nationality: "" });
        }

        // Build note with group code, menu info, price, and special requests
        const noteParts: string[] = [];
        if (r.groupCode) noteParts.push(r.groupCode);
        if (r.menu) noteParts.push(`Menu: ${r.menu}`);
        if (r.pricePerPerson) noteParts.push(`Cena: ${r.pricePerPerson} Kč/os`);
        if (r.notes) noteParts.push(r.notes);

        return {
          date: r.date,
          persons,
          status: "RECEIVED" as const,
          contactNote: noteParts.join(" | "),
          transfers: [],
        };
      });

      setReservations(newReservations);
      setActiveTabIndex(0);
      successToast(`AI načetl ${newReservations.length} rezervací do formuláře`);
    } catch (e: any) {
      errorToast(e?.message || "Chyba při aplikaci AI dat");
    }
  };

  // Submit handlers
  const handleSubmitAll = async () => {
    // Validate
    if (!sharedContact.contactName || !sharedContact.contactEmail || !sharedContact.contactPhone) {
      errorToast("Vyplňte kontaktní údaje");
      return;
    }

    const invalidReservations = reservations.filter(r => !r.date || r.persons.length === 0);
    if (invalidReservations.length > 0) {
      errorToast("Některé rezervace nemají datum nebo osoby");
      return;
    }

    setIsSubmitting(true);
    setSubmitProgress(0);
    setSubmitResults([]);

    const results: typeof submitResults = [];

    for (let i = 0; i < reservations.length; i++) {
      const res = reservations[i];
      const payload = {
        date: res.date,
        contactName: sharedContact.contactName,
        contactEmail: sharedContact.contactEmail,
        contactPhone: sharedContact.contactPhone,
        contactNationality: sharedContact.contactNationality,
        clientComeFrom: sharedContact.clientComeFrom,
        contactNote: res.contactNote,
        invoiceSameAsContact: sharedContact.invoiceSameAsContact,
        invoiceName: sharedContact.invoiceName,
        invoiceCompany: sharedContact.invoiceCompany,
        invoiceIc: sharedContact.invoiceIc,
        invoiceDic: sharedContact.invoiceDic,
        invoiceEmail: sharedContact.invoiceEmail,
        invoicePhone: sharedContact.invoicePhone,
        transferSelected: res.transfers.length > 0,
        transfers: res.transfers,
        agreement: true,
        persons: res.persons,
        status: res.status,
        reservationTypeId: res.reservationTypeId,
      };

      try {
        await api.post("/api/reservations", payload);
        results.push({ success: true, date: res.date });
      } catch (e: any) {
        results.push({ success: false, date: res.date, error: e?.message || "Chyba" });
      }

      setSubmitProgress(((i + 1) / reservations.length) * 100);
    }

    setSubmitResults(results);
    setIsSubmitting(false);

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    invalidateReservationQueries();

    if (failCount === 0) {
      successToast(`Úspěšně vytvořeno ${successCount} rezervací`);
      navigate("/reservations");
    } else {
      errorToast(`Vytvořeno ${successCount} z ${reservations.length} rezervací, ${failCount} se nepodařilo`);
    }
  };

  const handleSubmitSingle = async () => {
    if (!sharedContact.contactName || !sharedContact.contactEmail || !sharedContact.contactPhone) {
      errorToast("Vyplňte kontaktní údaje");
      return;
    }

    const res = reservations[0];
    if (!res.date || res.persons.length === 0) {
      errorToast("Vyplňte datum a přidejte osoby");
      return;
    }

    setIsSubmitting(true);

    const payload = {
      date: res.date,
      contactName: sharedContact.contactName,
      contactEmail: sharedContact.contactEmail,
      contactPhone: sharedContact.contactPhone,
      contactNationality: sharedContact.contactNationality,
      clientComeFrom: sharedContact.clientComeFrom,
      contactNote: res.contactNote,
      invoiceSameAsContact: sharedContact.invoiceSameAsContact,
      invoiceName: sharedContact.invoiceName,
      invoiceCompany: sharedContact.invoiceCompany,
      invoiceIc: sharedContact.invoiceIc,
      invoiceDic: sharedContact.invoiceDic,
      invoiceEmail: sharedContact.invoiceEmail,
      invoicePhone: sharedContact.invoicePhone,
      transferSelected: res.transfers.length > 0,
      transfers: res.transfers,
      agreement: true,
      persons: res.persons,
      status: res.status,
      reservationTypeId: res.reservationTypeId,
    };

    try {
      if (isEdit && reservationId) {
        await api.put(`/api/reservations/${reservationId}`, payload);
        successToast("Rezervace byla aktualizována");
      } else {
        // Create reservation and get the ID
        const newReservation = await api.post<Reservation>("/api/reservations", payload);
        successToast("Rezervace byla vytvořena");

        // Auto-create invoice if enabled
        if (autoCreateInvoice && newReservation.id) {
          try {
            if (autoInvoiceType === "DEPOSIT") {
              await api.post(`/api/invoices/create-deposit/${newReservation.id}`, {
                percent: autoInvoicePercent,
              });
              successToast("Zálohová faktura vytvořena");
            } else {
              await api.post(`/api/invoices/create-final/${newReservation.id}`);
              successToast("Ostrá faktura vytvořena");
            }
          } catch (invoiceError: any) {
            errorToast(invoiceError?.message || "Rezervace vytvořena, ale faktura se nepodařila vytvořit");
          }
        }
      }
      invalidateReservationQueries();
      invalidateInvoiceQueries();
      navigate("/reservations");
    } catch (e: any) {
      errorToast(e?.message || "Chyba při ukládání");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Computed values
  const currentReservation = reservations[activeTabIndex] || reservations[0];
  const currentTotalPrice = useMemo(() => {
    return currentReservation?.persons.reduce((sum, p) => sum + (Number(p.price) || 0), 0) || 0;
  }, [currentReservation?.persons]);

  const grandTotalPrice = useMemo(() => {
    return reservations.reduce((total, r) =>
      total + r.persons.reduce((sum, p) => sum + (Number(p.price) || 0), 0), 0
    );
  }, [reservations]);

  // Render
  if (isEdit && isLoadingReservation) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Načítání rezervace…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            {isEdit ? `Upravit rezervaci #${reservationId}` : "Nová rezervace"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {reservations.length > 1
              ? `${reservations.length} rezervací, celkem ${formatCurrency(grandTotalPrice)}`
              : isEdit
                ? "Úprava existující rezervace"
                : "Vytvoření nové rezervace"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/reservations")}>
            Zpět na seznam
          </Button>
          {reservations.length === 1 ? (
            <Button onClick={handleSubmitSingle} disabled={isSubmitting}>
              {isSubmitting ? "Ukládám…" : isEdit ? "Uložit změny" : "Vytvořit"}
            </Button>
          ) : (
            <Button onClick={handleSubmitAll} disabled={isSubmitting}>
              {isSubmitting
                ? "Ukládám…"
                : `Vytvořit vše (${reservations.length})`}
            </Button>
          )}
        </div>
      </div>

      <SubmitProgressCard
        isSubmitting={isSubmitting}
        submitProgress={submitProgress}
        submitResults={submitResults}
        reservationCount={reservations.length}
      />

      {/* Main form card */}
      <Card>
        <CardHeader>
          <CardTitle>Formulář</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={isEdit ? "reservations" : "ai"} className="w-full">
            <TabsList>
              <TabsTrigger value="ai">
                <Bot className="w-4 h-4 mr-2" /> AI asistent
              </TabsTrigger>
              <TabsTrigger value="contact">Kontakt</TabsTrigger>
              <TabsTrigger value="invoice">Fakturace</TabsTrigger>
              <TabsTrigger value="reservations">
                Rezervace ({reservations.length})
              </TabsTrigger>
              {isEdit && (
                <TabsTrigger value="payments">
                  <Receipt className="w-4 h-4 mr-2" /> Platby a faktury
                </TabsTrigger>
              )}
            </TabsList>

            {/* AI Tab */}
            <TabsContent value="ai" className="space-y-4">
              {!isAiConfigured() && (
                <div className="p-3 rounded-md bg-yellow-100 text-yellow-900 text-sm">
                  AI není nakonfigurováno. Nastavte proměnnou VITE_AI_BASE_URL v
                  .env.
                </div>
              )}
              <div className="space-y-2">
                <Label>Vložte e-mail / konverzaci ke zpracování</Label>
                <Textarea
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  placeholder="Sem vložte text e-mailu s více daty rezervací…"
                  className="min-h-48"
                />
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleAiAnalyze}
                    disabled={aiLoading}
                  >
                    {aiLoading ? "Analýza…" : "Analyzovat AI"}
                  </Button>
                  <Button
                    type="button"
                    onClick={handleAiApply}
                    disabled={!aiJson}
                  >
                    Použít do formuláře
                  </Button>
                </div>
              </div>
              {aiError && (
                <div className="p-3 rounded-md bg-destructive/10 text-destructive">
                  {aiError}
                </div>
              )}
              {aiJson && (
                <div className="space-y-2">
                  <Label>
                    Náhled AI výsledku ({aiJson.reservations.length} rezervací)
                  </Label>
                  <div className="p-3 bg-muted rounded-md space-y-2">
                    <div className="text-sm">
                      <strong>Kontakt:</strong> {aiJson.contact.name} (
                      {aiJson.contact.email})
                    </div>
                    <div className="text-sm">
                      <strong>Fakturace:</strong>{" "}
                      {aiJson.contact.invoiceCompany}, IČO:{" "}
                      {aiJson.contact.invoiceIc}, DIČ:{" "}
                      {aiJson.contact.invoiceDic}
                    </div>
                    <div className="border-t pt-2 mt-2">
                      <strong className="text-sm">Rezervace:</strong>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mt-1">
                        {aiJson.reservations.map((r, i) => (
                          <div
                            key={r.groupCode || `res-${i}`}
                            className="text-xs p-2 bg-background rounded border"
                          >
                            <div className="flex justify-between items-start">
                              <div className="font-medium">
                                {dayjs(r.date).format("D.M.YYYY")}
                              </div>
                              {r.groupCode && (
                                <span className="text-[10px] bg-primary/10 text-primary px-1 rounded">
                                  {r.groupCode}
                                </span>
                              )}
                            </div>
                            <div>
                              {r.adults} dosp. + {r.freeTourLeaders || 0} TL +{" "}
                              {r.freeDrivers || 0} řidič
                            </div>
                            {r.pricePerPerson && (
                              <div className="text-green-600 font-medium">
                                Cena: {r.pricePerPerson} Kč/os
                              </div>
                            )}
                            {r.menu && (
                              <div
                                className="text-muted-foreground truncate"
                                title={r.menu}
                              >
                                Menu: {r.menu}
                              </div>
                            )}
                            {r.notes && (
                              <div
                                className="text-muted-foreground truncate"
                                title={r.notes}
                              >
                                {r.notes}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Contact Tab */}
            <TabsContent value="contact" className="space-y-4">
              <ContactSection
                sharedContact={sharedContact}
                setSharedContact={setSharedContact}
                contactQuery={contactQuery}
                setContactQuery={setContactQuery}
                isContactDropdownOpen={isContactDropdownOpen}
                setIsContactDropdownOpen={setIsContactDropdownOpen}
                contactBoxRef={contactBoxRef}
                isSearchingContacts={isSearchingContacts}
                contactSearchItems={contactSearch?.items}
                applyContactToForm={applyContactToForm}
              />
            </TabsContent>

            {/* Invoice Tab */}
            <TabsContent value="invoice" className="space-y-4">
              <BillingSection
                sharedContact={sharedContact}
                setSharedContact={setSharedContact}
                companyQuery={companyQuery}
                setCompanyQuery={setCompanyQuery}
                companyResults={companyResults}
                isCompanyDropdownOpen={isCompanyDropdownOpen}
                setIsCompanyDropdownOpen={setIsCompanyDropdownOpen}
                isCompanySearching={isCompanySearching}
                companyBoxRef={companyBoxRef}
                applyCompanyToForm={applyCompanyToForm}
                isEdit={isEdit}
                autoCreateInvoice={autoCreateInvoice}
                setAutoCreateInvoice={setAutoCreateInvoice}
                autoInvoiceType={autoInvoiceType}
                setAutoInvoiceType={setAutoInvoiceType}
                autoInvoicePercent={autoInvoicePercent}
                setAutoInvoicePercent={setAutoInvoicePercent}
              />
            </TabsContent>

            {/* Reservations Tab */}
            <TabsContent value="reservations" className="space-y-4">
              {/* Reservation tabs */}
              <div className="flex flex-wrap items-center gap-2 border-b pb-2">
                {reservations.map((r, i) => (
                  <Button
                    key={i}
                    variant={activeTabIndex === i ? "default" : "outline"}
                    size="sm"
                    className="relative"
                    onClick={() => setActiveTabIndex(i)}
                  >
                    {r.date ? dayjs(r.date).format("D.M") : `#${i + 1}`}
                    {reservations.length > 1 && (
                      <span
                        className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground rounded-full text-xs flex items-center justify-center cursor-pointer hover:bg-destructive/80"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeReservation(i);
                        }}
                      >
                        ×
                      </span>
                    )}
                  </Button>
                ))}
                <Button variant="ghost" size="sm" onClick={addReservation}>
                  <Plus className="w-4 h-4 mr-1" /> Přidat
                </Button>
              </div>

              {/* Current reservation form */}
              {currentReservation && (
                <div className="space-y-4">
                  {/* Date, status, type, note row */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <Label>Datum *</Label>
                      <Input
                        type="date"
                        value={currentReservation.date}
                        onChange={(e) =>
                          updateReservation(activeTabIndex, {
                            date: e.target.value,
                          })
                        }
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Status</Label>
                      <Select
                        value={currentReservation.status}
                        onValueChange={(v) =>
                          updateReservation(activeTabIndex, {
                            status: v as any,
                          })
                        }
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="RECEIVED">
                            <StatusBadge status="RECEIVED" type="reservation" />
                          </SelectItem>
                          <SelectItem value="WAITING_PAYMENT">
                            <StatusBadge
                              status="WAITING_PAYMENT"
                              type="reservation"
                            />
                          </SelectItem>
                          <SelectItem value="PAID">
                            <StatusBadge status="PAID" type="reservation" />
                          </SelectItem>
                          <SelectItem value="AUTHORIZED">
                            <StatusBadge
                              status="AUTHORIZED"
                              type="reservation"
                            />
                          </SelectItem>
                          <SelectItem value="CONFIRMED">
                            <StatusBadge
                              status="CONFIRMED"
                              type="reservation"
                            />
                          </SelectItem>
                          <SelectItem value="CANCELLED">
                            <StatusBadge
                              status="CANCELLED"
                              type="reservation"
                            />
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Druh rezervace</Label>
                      <Select
                        value={currentReservation.reservationTypeId?.toString() || ""}
                        onValueChange={(v) =>
                          updateReservation(activeTabIndex, {
                            reservationTypeId: v ? Number(v) : undefined,
                          })
                        }
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Vyberte druh" />
                        </SelectTrigger>
                        <SelectContent>
                          {reservationTypes?.map((rt) => (
                            <SelectItem key={rt.id} value={rt.id.toString()}>
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full border"
                                  style={{ backgroundColor: rt.color }}
                                />
                                {rt.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Poznámka</Label>
                      <Input
                        value={currentReservation.contactNote}
                        onChange={(e) =>
                          updateReservation(activeTabIndex, {
                            contactNote: e.target.value,
                          })
                        }
                        className="mt-1"
                        placeholder="Poznámka k rezervaci"
                      />
                    </div>
                  </div>

                  {/* Transfers */}
                  <div className="rounded-md border p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-semibold">Transfer</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addTransfer(activeTabIndex)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Přidat destinaci
                      </Button>
                    </div>

                    {currentReservation.transfers.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        Žádné transfery. Klikněte na "Přidat destinaci" pro přidání transferu.
                      </p>
                    )}

                    {currentReservation.transfers.map((transfer, transferIndex) => (
                      <div key={transferIndex} className="flex items-start gap-3 p-3 bg-muted/50 rounded-md">
                        <div className="w-24">
                          <Label className="text-xs text-muted-foreground">Počet osob</Label>
                          <Input
                            type="number"
                            min={1}
                            value={transfer.personCount}
                            onChange={(e) =>
                              updateTransfer(activeTabIndex, transferIndex, {
                                personCount: Number(e.target.value) || 1,
                              })
                            }
                            className="mt-1"
                          />
                        </div>
                        <div className="flex-1 relative" ref={activeTransferIndex === transferIndex ? addressBoxRef : undefined}>
                          <Label className="text-xs text-muted-foreground">Adresa destinace</Label>
                          <Input
                            value={transfer.address}
                            onChange={(e) => {
                              updateTransfer(activeTabIndex, transferIndex, {
                                address: e.target.value,
                              });
                              setActiveTransferIndex(transferIndex);
                              setIsAddressDropdownOpen(true);
                            }}
                            onFocus={() => {
                              setActiveTransferIndex(transferIndex);
                              setIsAddressDropdownOpen(true);
                            }}
                            className="mt-1"
                            placeholder="Začněte psát adresu..."
                          />
                          {isAddressDropdownOpen && activeTransferIndex === transferIndex && transfer.address.length >= 3 && (
                            <div className="absolute z-20 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md">
                              <div className="max-h-64 overflow-auto p-1 text-sm">
                                {isAddressSearching && (
                                  <div className="px-3 py-2 text-muted-foreground">
                                    Hledám adresy...
                                  </div>
                                )}
                                {!isAddressSearching && addressResults.length === 0 && (
                                  <div className="px-3 py-2 text-muted-foreground">
                                    Žádné výsledky
                                  </div>
                                )}
                                {addressResults.map((result) => (
                                  <button
                                    type="button"
                                    key={result.place_id}
                                    className="flex w-full items-start gap-2 px-3 py-2 hover:bg-accent hover:text-accent-foreground text-left rounded-sm"
                                    onClick={() => {
                                      updateTransfer(activeTabIndex, transferIndex, {
                                        address: getShortAddress(result),
                                      });
                                      setIsAddressDropdownOpen(false);
                                      setAddressResults([]);
                                    }}
                                  >
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium truncate">
                                        {getShortAddress(result)}
                                      </div>
                                      <div className="text-xs text-muted-foreground truncate">
                                        {result.display_name}
                                      </div>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="mt-6 text-destructive hover:text-destructive"
                          onClick={() => removeTransfer(activeTabIndex, transferIndex)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}

                    {currentReservation.transfers.length > 0 && (
                      <div className="text-sm text-muted-foreground pt-2 border-t">
                        Celkem osob k transferu: {currentReservation.transfers.reduce((sum, t) => sum + t.personCount, 0)}
                      </div>
                    )}
                  </div>

                  <ReservationPersonsSection
                    currentReservation={currentReservation}
                    activeTabIndex={activeTabIndex}
                    foods={foods}
                    currentTotalPrice={currentTotalPrice}
                    bulkCount={bulkCount}
                    setBulkCount={setBulkCount}
                    bulkType={bulkType}
                    setBulkType={setBulkType}
                    bulkMenu={bulkMenu}
                    setBulkMenu={setBulkMenu}
                    bulkPrice={bulkPrice}
                    setBulkPrice={setBulkPrice}
                    bulkNationality={bulkNationality}
                    setBulkNationality={setBulkNationality}
                    bulkPriceChange={bulkPriceChange}
                    setBulkPriceChange={setBulkPriceChange}
                    bulkMenuChange={bulkMenuChange}
                    setBulkMenuChange={setBulkMenuChange}
                    addPerson={addPerson}
                    addBulkPersons={addBulkPersons}
                    applyBulkPriceChange={applyBulkPriceChange}
                    applyBulkMenuChange={applyBulkMenuChange}
                    handleTypeChange={handleTypeChange}
                    handleMenuChange={handleMenuChange}
                    updatePerson={updatePerson}
                    removePerson={removePerson}
                  />
                </div>
              )}
            </TabsContent>

            {/* Payments & Invoices Tab (only in edit mode) */}
            {isEdit && (
              <TabsContent value="payments" className="space-y-6">
                <PaymentInvoicesSection
                  reservationId={Number(reservationId)}
                  paymentSummary={paymentSummary}
                  summaryLoading={summaryLoading}
                  invoices={invoices}
                  invoicesLoading={invoicesLoading}
                  markPaidMutation={markPaidMutation}
                  markInvoicePaidMutation={markInvoicePaidMutation}
                  isAnyInvoiceMutationPending={isAnyInvoiceMutationPending}
                  setInvoiceDialogType={setInvoiceDialogType}
                  setInvoiceDialogPercent={setInvoiceDialogPercent}
                  setInvoiceDialogOpen={setInvoiceDialogOpen}
                />
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>

      {/* Invoice Create Dialog */}
      {isEdit && reservationId && (
        <InvoiceCreateDialog
          open={invoiceDialogOpen}
          onOpenChange={setInvoiceDialogOpen}
          reservationId={Number(reservationId)}
          invoiceType={invoiceDialogType}
          depositPercent={invoiceDialogPercent}
          onSuccess={invalidateInvoices}
        />
      )}
    </div>
  );
}
