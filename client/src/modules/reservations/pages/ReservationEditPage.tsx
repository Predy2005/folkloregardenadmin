import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { queryClient } from "@/shared/lib/queryClient";
import { useToast } from "@/shared/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { Checkbox } from "@/shared/components/ui/checkbox";
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
import { Progress } from "@/shared/components/ui/progress";
import type {
  Reservation,
  ReservationFood,
  PricingDefault,
  Invoice,
  PaymentSummary,
} from "@shared/types";
import {
  PERSON_TYPE_LABELS,
  INVOICE_TYPE_LABELS,
  RESERVATION_PAYMENT_STATUS_LABELS,
  RESERVATION_PAYMENT_METHOD_LABELS,
} from "@shared/types";
import dayjs from "dayjs";
import { Bot, Plus, Trash2, X, Search, Building2, Receipt, FileText, Banknote, CreditCard, CheckCircle, Loader2 } from "lucide-react";
import {
  isAiConfigured,
  parseMultiReservationWithAI,
  type AiParsedMultiReservation,
  type AiMultiReservationEntry,
} from "@modules/reservations/utils/ai";
import { cn } from "@/shared/lib/utils";
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

// Types for multi-reservation form
interface PersonEntry {
  type: "adult" | "child" | "infant" | "driver" | "guide";
  menu: string;
  price: number;
}

interface ReservationEntry {
  date: string;
  persons: PersonEntry[];
  status: "RECEIVED" | "WAITING_PAYMENT" | "PAID" | "CANCELLED" | "AUTHORIZED" | "CONFIRMED";
  contactNote: string;
  transferSelected: boolean;
  transferCount: number;
  transferAddress: string;
}

interface SharedContact {
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  contactNationality: string;
  clientComeFrom: string;
  invoiceSameAsContact: boolean;
  invoiceName: string;
  invoiceCompany: string;
  invoiceIc: string;
  invoiceDic: string;
  invoiceEmail: string;
  invoicePhone: string;
}

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
  transferSelected: false,
  transferCount: 0,
  transferAddress: "",
};

export default function ReservationEdit() {
  const [, navigate] = useLocation();
  const [isEditMatch, params] = useRoute("/reservations/:id/edit");
  const isEdit = !!isEditMatch;
  const reservationId = params?.id ? Number(params.id) : null;
  const { toast } = useToast();

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
  const addressBoxRef = useRef<HTMLDivElement | null>(null);

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

  const invalidateInvoices = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
    queryClient.invalidateQueries({ queryKey: ["/api/invoices/reservation", reservationId] });
    queryClient.invalidateQueries({ queryKey: ["/api/reservations"] });
    queryClient.invalidateQueries({ queryKey: ["/api/reservations", reservationId, "payment-summary"] });
  };

  // Invoice mutations
  const createDepositMutation = useMutation({
    mutationFn: ({ percent }: { percent: number }) =>
      api.post<Invoice>(`/api/invoices/create-deposit/${reservationId}`, { percent }),
    onSuccess: () => {
      invalidateInvoices();
      toast({ title: "Zálohová faktura byla úspěšně vytvořena" });
    },
    onError: (error: Error) => {
      toast({
        title: "Chyba při vytváření zálohové faktury",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createFinalMutation = useMutation({
    mutationFn: () => api.post<Invoice>(`/api/invoices/create-final/${reservationId}`),
    onSuccess: () => {
      invalidateInvoices();
      toast({ title: "Ostrá faktura byla úspěšně vytvořena" });
    },
    onError: (error: Error) => {
      toast({
        title: "Chyba při vytváření ostré faktury",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: ({ paymentMethod }: { paymentMethod: string }) =>
      api.post(`/api/reservations/${reservationId}/mark-paid`, { paymentMethod }),
    onSuccess: () => {
      invalidateInvoices();
      toast({ title: "Rezervace byla označena jako zaplacená" });
    },
    onError: (error: Error) => {
      toast({
        title: "Chyba při označování jako zaplaceno",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const markInvoicePaidMutation = useMutation({
    mutationFn: (invoiceId: number) => api.post(`/api/invoices/${invoiceId}/pay`),
    onSuccess: () => {
      invalidateInvoices();
      toast({ title: "Faktura byla označena jako zaplacená" });
    },
    onError: (error: Error) => {
      toast({
        title: "Chyba při označování faktury",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const isAnyInvoiceMutationPending =
    createDepositMutation.isPending ||
    createFinalMutation.isPending ||
    markPaidMutation.isPending ||
    markInvoicePaidMutation.isPending;

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
    if (companyQuery.length < 2) {
      setCompanyResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsCompanySearching(true);
      try {
        const results = await searchCompanies(companyQuery);
        setCompanyResults(results);
      } catch (e) {
        console.error("Company search failed:", e);
        setCompanyResults([]);
      } finally {
        setIsCompanySearching(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [companyQuery]);

  // Address search handler with debounce
  useEffect(() => {
    const address = reservations[activeTabIndex]?.transferAddress || "";
    if (address.length < 3 || !isAddressDropdownOpen) {
      setAddressResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsAddressSearching(true);
      try {
        const results = await searchAddresses(address);
        setAddressResults(results);
      } catch (e) {
        console.error("Address search failed:", e);
        setAddressResults([]);
      } finally {
        setIsAddressSearching(false);
      }
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [reservations, activeTabIndex, isAddressDropdownOpen]);

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
      setReservations([{
        date: dayjs(reservation.date).format("YYYY-MM-DD"),
        persons: reservation.persons?.map(p => ({
          type: p.type,
          menu: p.menu,
          price: p.price,
        })) || [],
        status: reservation.status,
        contactNote: reservation.contactNote || "",
        transferSelected: reservation.transferSelected,
        transferCount: reservation.transferCount || 0,
        transferAddress: reservation.transferAddress || "",
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

  const addPerson = (resIndex: number, type: PersonEntry["type"]) => {
    const defaultPrice =
      type === "adult" ? pricing?.adultPrice || 1250 :
      type === "child" ? pricing?.childPrice || 800 :
      0;

    const menu = (type === "infant" || type === "driver" || type === "guide") ? "Bez jídla" : "";

    updateReservation(resIndex, {
      persons: [...reservations[resIndex].persons, { type, menu, price: defaultPrice }],
    });
  };

  const updatePerson = (resIndex: number, personIndex: number, updates: Partial<PersonEntry>) => {
    const newPersons = [...reservations[resIndex].persons];
    newPersons[personIndex] = { ...newPersons[personIndex], ...updates };
    updateReservation(resIndex, { persons: newPersons });
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
      toast({ title: "Zadejte platný počet osob", variant: "destructive" });
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
    }));

    updateReservation(resIndex, {
      persons: [...reservations[resIndex].persons, ...newPersons],
    });
    setBulkCount(1);
  };

  const applyBulkPriceChange = (resIndex: number) => {
    const newPrice = Number(bulkPriceChange);
    if (!Number.isFinite(newPrice) || newPrice < 0) {
      toast({ title: "Zadejte platnou cenu", variant: "destructive" });
      return;
    }
    // Apply to all paying persons (adult, child)
    const updatedPersons = reservations[resIndex].persons.map(p =>
      (p.type === "adult" || p.type === "child") ? { ...p, price: newPrice } : p
    );
    updateReservation(resIndex, { persons: updatedPersons });
    setBulkPriceChange("");
    const affectedCount = reservations[resIndex].persons.filter(p => p.type === "adult" || p.type === "child").length;
    toast({ title: `Cena změněna u ${affectedCount} platících osob` });
  };

  const applyBulkMenuChange = (resIndex: number) => {
    if (!bulkMenuChange) {
      toast({ title: "Vyberte menu", variant: "destructive" });
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
    toast({ title: `Menu změněno u ${affectedCount} osob` });
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

        // Add adults with the group's specific menu and price
        for (let i = 0; i < r.adults; i++) {
          persons.push({ type: "adult", menu: groupMenu, price: adultPrice });
        }

        // Add children (use proportional child price if custom price is set)
        const childMenu = foods?.find(f => f.isChildrenMenu)?.name || "Dětské menu";
        const childPrice = r.pricePerPerson
          ? Math.round(r.pricePerPerson * 0.64) // ~64% of adult price for children
          : defaultChildPrice;
        for (let i = 0; i < r.children; i++) {
          persons.push({ type: "child", menu: childMenu, price: childPrice });
        }

        // Add infants
        for (let i = 0; i < r.infants; i++) {
          persons.push({ type: "infant", menu: "Bez jídla", price: 0 });
        }

        // Add free tour leaders (guides)
        for (let i = 0; i < r.freeTourLeaders; i++) {
          persons.push({ type: "guide", menu: "Bez jídla", price: 0 });
        }

        // Add free drivers
        for (let i = 0; i < r.freeDrivers; i++) {
          persons.push({ type: "driver", menu: "Bez jídla", price: 0 });
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
          transferSelected: false,
          transferCount: 0,
          transferAddress: "",
        };
      });

      setReservations(newReservations);
      setActiveTabIndex(0);
      toast({ title: `AI načetl ${newReservations.length} rezervací do formuláře` });
    } catch (e: any) {
      toast({
        title: "Chyba při aplikaci AI dat",
        description: e?.message,
        variant: "destructive",
      });
    }
  };

  // Submit handlers
  const handleSubmitAll = async () => {
    // Validate
    if (!sharedContact.contactName || !sharedContact.contactEmail || !sharedContact.contactPhone) {
      toast({ title: "Vyplňte kontaktní údaje", variant: "destructive" });
      return;
    }

    const invalidReservations = reservations.filter(r => !r.date || r.persons.length === 0);
    if (invalidReservations.length > 0) {
      toast({ title: "Některé rezervace nemají datum nebo osoby", variant: "destructive" });
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
        transferSelected: res.transferSelected,
        transferCount: res.transferCount,
        transferAddress: res.transferAddress,
        agreement: true,
        persons: res.persons,
        status: res.status,
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

    queryClient.invalidateQueries({ queryKey: ["/api/reservations"] });

    if (failCount === 0) {
      toast({ title: `Úspěšně vytvořeno ${successCount} rezervací` });
      navigate("/reservations");
    } else {
      toast({
        title: `Vytvořeno ${successCount} z ${reservations.length} rezervací`,
        description: `${failCount} rezervací se nepodařilo vytvořit`,
        variant: "destructive",
      });
    }
  };

  const handleSubmitSingle = async () => {
    if (!sharedContact.contactName || !sharedContact.contactEmail || !sharedContact.contactPhone) {
      toast({ title: "Vyplňte kontaktní údaje", variant: "destructive" });
      return;
    }

    const res = reservations[0];
    if (!res.date || res.persons.length === 0) {
      toast({ title: "Vyplňte datum a přidejte osoby", variant: "destructive" });
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
      transferSelected: res.transferSelected,
      transferCount: res.transferCount,
      transferAddress: res.transferAddress,
      agreement: true,
      persons: res.persons,
      status: res.status,
    };

    try {
      if (isEdit && reservationId) {
        await api.put(`/api/reservations/${reservationId}`, payload);
        toast({ title: "Rezervace byla aktualizována" });
      } else {
        // Create reservation and get the ID
        const newReservation = await api.post<Reservation>("/api/reservations", payload);
        toast({ title: "Rezervace byla vytvořena" });

        // Auto-create invoice if enabled
        if (autoCreateInvoice && newReservation.id) {
          try {
            if (autoInvoiceType === "DEPOSIT") {
              await api.post(`/api/invoices/create-deposit/${newReservation.id}`, {
                percent: autoInvoicePercent,
              });
              toast({ title: "Zálohová faktura vytvořena" });
            } else {
              await api.post(`/api/invoices/create-final/${newReservation.id}`);
              toast({ title: "Ostrá faktura vytvořena" });
            }
          } catch (invoiceError: any) {
            toast({
              title: "Rezervace vytvořena, ale faktura se nepodařila vytvořit",
              description: invoiceError?.message,
              variant: "destructive",
            });
          }
        }
      }
      queryClient.invalidateQueries({ queryKey: ["/api/reservations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      navigate("/reservations");
    } catch (e: any) {
      toast({ title: "Chyba při ukládání", description: e?.message, variant: "destructive" });
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
              ? `${reservations.length} rezervací, celkem ${grandTotalPrice.toLocaleString("cs-CZ")} Kč`
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

      {/* Progress bar for bulk submit */}
      {isSubmitting && reservations.length > 1 && (
        <Card>
          <CardContent className="pt-6">
            <Progress value={submitProgress} className="w-full" />
            <p className="text-sm text-muted-foreground mt-2">
              Vytvářím rezervace... {Math.round(submitProgress)}%
            </p>
          </CardContent>
        </Card>
      )}

      {/* Submit results */}
      {submitResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Výsledky vytváření</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {submitResults.map((r, i) => (
                <div
                  key={i}
                  className={cn(
                    "text-sm",
                    r.success ? "text-green-600" : "text-red-600",
                  )}
                >
                  {r.date}: {r.success ? "✓ Vytvořeno" : `✗ ${r.error}`}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Contact autocomplete */}
                <div className="md:col-span-2" ref={contactBoxRef}>
                  <Label>Kontakt (vyhledat)</Label>
                  <div className="relative mt-1">
                    <Input
                      value={contactQuery}
                      onChange={(e) => {
                        setContactQuery(e.target.value);
                        setIsContactDropdownOpen(true);
                      }}
                      placeholder="Začněte psát jméno, e-mail nebo telefon…"
                    />
                    {isContactDropdownOpen &&
                      contactQuery.trim().length >= 2 && (
                        <div className="absolute z-20 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md">
                          <div className="max-h-64 overflow-auto p-1 text-sm">
                            {isSearchingContacts && (
                              <div className="px-3 py-2 text-muted-foreground">
                                Hledám…
                              </div>
                            )}
                            {!isSearchingContacts &&
                              (contactSearch?.items?.length ?? 0) === 0 && (
                                <div className="px-3 py-2 text-muted-foreground">
                                  Nenalezen žádný kontakt
                                </div>
                              )}
                            {contactSearch?.items?.map((c: any) => (
                              <button
                                type="button"
                                key={c.id}
                                className="flex w-full items-start gap-2 px-3 py-2 hover:bg-accent hover:text-accent-foreground text-left"
                                onClick={() => {
                                  applyContactToForm(c);
                                  setContactQuery("");
                                  setIsContactDropdownOpen(false);
                                }}
                              >
                                <div className="flex-1">
                                  <div className="font-medium">
                                    {c.name || "Bez jména"}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {[c.email, c.phone]
                                      .filter(Boolean)
                                      .join(" • ")}
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                  </div>
                </div>

                <div>
                  <Label>Jméno *</Label>
                  <Input
                    value={sharedContact.contactName}
                    onChange={(e) =>
                      setSharedContact((prev) => ({
                        ...prev,
                        contactName: e.target.value,
                      }))
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={sharedContact.contactEmail}
                    onChange={(e) =>
                      setSharedContact((prev) => ({
                        ...prev,
                        contactEmail: e.target.value,
                      }))
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Telefon *</Label>
                  <Input
                    value={sharedContact.contactPhone}
                    onChange={(e) =>
                      setSharedContact((prev) => ({
                        ...prev,
                        contactPhone: e.target.value,
                      }))
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Národnost *</Label>
                  <Input
                    value={sharedContact.contactNationality}
                    onChange={(e) =>
                      setSharedContact((prev) => ({
                        ...prev,
                        contactNationality: e.target.value,
                      }))
                    }
                    className="mt-1"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Odkud klient přišel</Label>
                  <Input
                    value={sharedContact.clientComeFrom}
                    onChange={(e) =>
                      setSharedContact((prev) => ({
                        ...prev,
                        clientComeFrom: e.target.value,
                      }))
                    }
                    className="mt-1"
                  />
                </div>
              </div>
            </TabsContent>

            {/* Invoice Tab */}
            <TabsContent value="invoice" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-row items-center space-x-3 rounded-md border p-4 md:col-span-2">
                  <Checkbox
                    checked={sharedContact.invoiceSameAsContact}
                    onCheckedChange={(checked) =>
                      setSharedContact((prev) => ({
                        ...prev,
                        invoiceSameAsContact: !!checked,
                      }))
                    }
                  />
                  <Label>Fakturační údaje stejné jako kontaktní</Label>
                </div>

                {/* Company search autocomplete */}
                <div className="md:col-span-2" ref={companyBoxRef}>
                  <Label className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Vyhledat firmu (IČO nebo název)
                  </Label>
                  <div className="relative mt-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        value={companyQuery}
                        onChange={(e) => {
                          setCompanyQuery(e.target.value);
                          setIsCompanyDropdownOpen(true);
                        }}
                        placeholder="Zadejte IČO nebo název firmy..."
                        className="pl-9"
                      />
                    </div>
                    {isCompanyDropdownOpen && companyQuery.length >= 2 && (
                      <div className="absolute z-20 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md">
                        <div className="max-h-64 overflow-auto p-1 text-sm">
                          {isCompanySearching && (
                            <div className="px-3 py-2 text-muted-foreground">
                              Hledám firmy...
                            </div>
                          )}
                          {!isCompanySearching &&
                            companyResults.length === 0 && (
                              <div className="px-3 py-2 text-muted-foreground">
                                Nenalezena žádná firma
                              </div>
                            )}
                          {companyResults.map((company, idx) => {
                            const parsed = parseCompanyData(company);
                            return (
                              <button
                                type="button"
                                key={`${company.ico}-${idx}`}
                                className="flex w-full items-start gap-2 px-3 py-2 hover:bg-accent hover:text-accent-foreground text-left rounded-sm"
                                onClick={() => applyCompanyToForm(company)}
                              >
                                <Building2 className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium truncate">
                                    {parsed.name}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    IČO: {parsed.ico}
                                    {parsed.dic && ` • DIČ: ${parsed.dic}`}
                                  </div>
                                  <div className="text-xs text-muted-foreground truncate">
                                    {parsed.street}, {parsed.zip} {parsed.city}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <Label>Jméno</Label>
                  <Input
                    value={sharedContact.invoiceName}
                    onChange={(e) =>
                      setSharedContact((prev) => ({
                        ...prev,
                        invoiceName: e.target.value,
                      }))
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Firma</Label>
                  <Input
                    value={sharedContact.invoiceCompany}
                    onChange={(e) =>
                      setSharedContact((prev) => ({
                        ...prev,
                        invoiceCompany: e.target.value,
                      }))
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>IČ</Label>
                  <Input
                    value={sharedContact.invoiceIc}
                    onChange={(e) =>
                      setSharedContact((prev) => ({
                        ...prev,
                        invoiceIc: e.target.value,
                      }))
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>DIČ</Label>
                  <Input
                    value={sharedContact.invoiceDic}
                    onChange={(e) =>
                      setSharedContact((prev) => ({
                        ...prev,
                        invoiceDic: e.target.value,
                      }))
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={sharedContact.invoiceEmail}
                    onChange={(e) =>
                      setSharedContact((prev) => ({
                        ...prev,
                        invoiceEmail: e.target.value,
                      }))
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Telefon</Label>
                  <Input
                    value={sharedContact.invoicePhone}
                    onChange={(e) =>
                      setSharedContact((prev) => ({
                        ...prev,
                        invoicePhone: e.target.value,
                      }))
                    }
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Auto-create invoice options (only for create mode) */}
              {!isEdit && (
                <div className="mt-6 pt-4 border-t">
                  <div className="flex flex-row items-start space-x-3 rounded-md border p-4 bg-muted/50">
                    <Checkbox
                      id="autoCreateInvoice"
                      checked={autoCreateInvoice}
                      onCheckedChange={(checked) => setAutoCreateInvoice(!!checked)}
                    />
                    <div className="space-y-2 flex-1">
                      <Label htmlFor="autoCreateInvoice" className="font-medium cursor-pointer">
                        Po vytvoření automaticky vytvořit fakturu
                      </Label>
                      {autoCreateInvoice && (
                        <div className="flex flex-wrap gap-4 mt-3">
                          <div>
                            <Label className="text-sm text-muted-foreground">Typ faktury</Label>
                            <Select
                              value={autoInvoiceType}
                              onValueChange={(v) => setAutoInvoiceType(v as "DEPOSIT" | "FINAL")}
                            >
                              <SelectTrigger className="w-40 mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="DEPOSIT">Zálohová faktura</SelectItem>
                                <SelectItem value="FINAL">Ostrá faktura</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {autoInvoiceType === "DEPOSIT" && (
                            <div>
                              <Label className="text-sm text-muted-foreground">Procento zálohy</Label>
                              <Select
                                value={String(autoInvoicePercent)}
                                onValueChange={(v) => setAutoInvoicePercent(Number(v))}
                              >
                                <SelectTrigger className="w-28 mt-1">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="25">25%</SelectItem>
                                  <SelectItem value="30">30%</SelectItem>
                                  <SelectItem value="50">50%</SelectItem>
                                  <SelectItem value="100">100%</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
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
                  {/* Date and status row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

                  {/* Transfer */}
                  <div className="flex flex-row items-center space-x-3 rounded-md border p-4">
                    <Checkbox
                      checked={currentReservation.transferSelected}
                      onCheckedChange={(checked) =>
                        updateReservation(activeTabIndex, {
                          transferSelected: !!checked,
                        })
                      }
                    />
                    <Label>Chci zajistit transfer</Label>
                    {currentReservation.transferSelected && (
                      <>
                        <Input
                          type="number"
                          value={currentReservation.transferCount}
                          onChange={(e) =>
                            updateReservation(activeTabIndex, {
                              transferCount: Number(e.target.value),
                            })
                          }
                          className="w-24"
                          placeholder="Počet"
                        />
                        <div className="flex-1 relative" ref={addressBoxRef}>
                          <Input
                            value={currentReservation.transferAddress}
                            onChange={(e) => {
                              updateReservation(activeTabIndex, {
                                transferAddress: e.target.value,
                              });
                              setIsAddressDropdownOpen(true);
                            }}
                            onFocus={() => setIsAddressDropdownOpen(true)}
                            placeholder="Začněte psát adresu..."
                          />
                          {isAddressDropdownOpen && currentReservation.transferAddress.length >= 3 && (
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
                                      updateReservation(activeTabIndex, {
                                        transferAddress: getShortAddress(result),
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
                      </>
                    )}
                  </div>

                  {/* Bulk actions section */}
                  <div className="border rounded-md p-4 bg-muted/50 space-y-4">
                    <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      Hromadné akce
                    </Label>

                    {/* Bulk add persons */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                      <div className="md:col-span-2">
                        <Label className="text-xs">Počet osob</Label>
                        <Input
                          type="number"
                          min={1}
                          value={bulkCount}
                          onChange={(e) => setBulkCount(Number(e.target.value))}
                          className="mt-1"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label className="text-xs">Typ osoby</Label>
                        <Select
                          value={bulkType}
                          onValueChange={(v) => setBulkType(v as any)}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="adult">
                              {PERSON_TYPE_LABELS.adult}
                            </SelectItem>
                            <SelectItem value="child">
                              {PERSON_TYPE_LABELS.child}
                            </SelectItem>
                            <SelectItem value="infant">
                              {PERSON_TYPE_LABELS.infant}
                            </SelectItem>
                            <SelectItem value="driver">
                              {PERSON_TYPE_LABELS.driver}
                            </SelectItem>
                            <SelectItem value="guide">
                              {PERSON_TYPE_LABELS.guide}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="md:col-span-4">
                        <Label className="text-xs">Menu</Label>
                        <Select
                          value={bulkMenu}
                          onValueChange={(v) => setBulkMenu(v)}
                          disabled={
                            bulkType === "infant" ||
                            bulkType === "driver" ||
                            bulkType === "guide"
                          }
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Vyberte menu" />
                          </SelectTrigger>
                          <SelectContent>
                            {foods?.map((f) => (
                              <SelectItem
                                key={f.id}
                                value={f.externalId || f.name}
                              >
                                {f.name}
                                {f.surcharge > 0 && (
                                  <span className="text-orange-600 ml-1">
                                    (+{f.surcharge} Kč)
                                  </span>
                                )}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="md:col-span-2">
                        <Label className="text-xs">Cena/os.</Label>
                        <Input
                          type="number"
                          min={0}
                          value={bulkPrice}
                          onChange={(e) =>
                            setBulkPrice(
                              e.target.value === "" ? "" : Number(e.target.value),
                            )
                          }
                          className="mt-1"
                          disabled={bulkType === "driver" || bulkType === "guide"}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Button
                          type="button"
                          variant="secondary"
                          className="w-full"
                          onClick={() => addBulkPersons(activeTabIndex)}
                        >
                          Přidat hromadně
                        </Button>
                      </div>
                    </div>

                    {/* Bulk menu and price change */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t">
                      {/* Bulk menu change */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Label className="text-xs whitespace-nowrap">
                          Změnit menu všem:
                        </Label>
                        <Select
                          value={bulkMenuChange}
                          onValueChange={setBulkMenuChange}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue placeholder="Vyberte menu" />
                          </SelectTrigger>
                          <SelectContent>
                            {foods?.map((f) => (
                              <SelectItem
                                key={f.id}
                                value={f.externalId || f.name}
                              >
                                {f.name}
                                {f.surcharge > 0 && (
                                  <span className="text-orange-600 ml-1">
                                    (+{f.surcharge} Kč)
                                  </span>
                                )}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => applyBulkMenuChange(activeTabIndex)}
                          disabled={
                            !bulkMenuChange ||
                            currentReservation.persons.length === 0
                          }
                        >
                          Aplikovat
                        </Button>
                      </div>
                      {/* Bulk price change */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Label className="text-xs whitespace-nowrap">
                          Změnit cenu všem:
                        </Label>
                        <Input
                          type="number"
                          min={0}
                          value={bulkPriceChange}
                          onChange={(e) =>
                            setBulkPriceChange(
                              e.target.value === "" ? "" : Number(e.target.value),
                            )
                          }
                          placeholder="Nová cena"
                          className="w-28"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => applyBulkPriceChange(activeTabIndex)}
                          disabled={
                            bulkPriceChange === "" ||
                            currentReservation.persons.length === 0
                          }
                        >
                          Aplikovat
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Quick add buttons + Total */}
                  <div className="flex items-center justify-between flex-wrap gap-3 py-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm text-muted-foreground mr-1">Rychle přidat:</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addPerson(activeTabIndex, "adult")}
                      >
                        + Dospělý
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addPerson(activeTabIndex, "child")}
                      >
                        + Dítě (3-12)
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addPerson(activeTabIndex, "infant")}
                      >
                        + Dítě (0-2)
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addPerson(activeTabIndex, "driver")}
                      >
                        + Řidič
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addPerson(activeTabIndex, "guide")}
                      >
                        + Průvodce
                      </Button>
                    </div>
                    {/* Total price */}
                    <div className="bg-primary/10 text-primary px-4 py-2 rounded-lg font-semibold text-lg">
                      Celkem: {currentTotalPrice.toLocaleString("cs-CZ")} Kč
                    </div>
                  </div>

                  {/* Persons list */}
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {currentReservation.persons.length === 0 ? (
                      <div className="text-sm text-muted-foreground p-4 text-center border rounded-md">
                        Zatím žádné osoby. Přidejte pomocí tlačítek výše.
                      </div>
                    ) : (
                      currentReservation.persons.map((person, pIndex) => (
                        <div
                          key={pIndex}
                          className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center border rounded-md p-2"
                        >
                          <div className="md:col-span-1 text-sm text-muted-foreground">
                            #{pIndex + 1}
                          </div>
                          <div className="md:col-span-2">
                            <Select
                              value={person.type}
                              onValueChange={(v) =>
                                updatePerson(activeTabIndex, pIndex, {
                                  type: v as any,
                                })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="adult">
                                  {PERSON_TYPE_LABELS.adult}
                                </SelectItem>
                                <SelectItem value="child">
                                  {PERSON_TYPE_LABELS.child}
                                </SelectItem>
                                <SelectItem value="infant">
                                  {PERSON_TYPE_LABELS.infant}
                                </SelectItem>
                                <SelectItem value="driver">
                                  {PERSON_TYPE_LABELS.driver}
                                </SelectItem>
                                <SelectItem value="guide">
                                  {PERSON_TYPE_LABELS.guide}
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="md:col-span-5">
                            <Select
                              value={person.menu}
                              onValueChange={(v) =>
                                handleMenuChange(activeTabIndex, pIndex, v)
                              }
                              disabled={
                                person.type === "infant" ||
                                person.type === "driver" ||
                                person.type === "guide"
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Vyberte menu" />
                              </SelectTrigger>
                              <SelectContent>
                                {foods?.map((f) => (
                                  <SelectItem
                                    key={f.id}
                                    value={f.externalId || f.name}
                                  >
                                    {f.name}
                                    {f.surcharge > 0 && (
                                      <span className="text-orange-600 ml-1">
                                        (+{f.surcharge} Kč)
                                      </span>
                                    )}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="md:col-span-2">
                            <Input
                              type="number"
                              value={person.price}
                              onChange={(e) =>
                                updatePerson(activeTabIndex, pIndex, {
                                  price: Number(e.target.value),
                                })
                              }
                              disabled={
                                person.type === "driver" ||
                                person.type === "guide"
                              }
                            />
                          </div>
                          <div className="md:col-span-2 flex justify-end">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                removePerson(activeTabIndex, pIndex)
                              }
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Payments & Invoices Tab (only in edit mode) */}
            {isEdit && (
              <TabsContent value="payments" className="space-y-6">
                {/* Payment Summary */}
                {summaryLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : paymentSummary && (
                  <div className="space-y-4">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-4 rounded-lg bg-muted/50 text-center">
                        <p className="text-sm text-muted-foreground">Celková cena</p>
                        <p className="text-xl font-bold font-mono">
                          {Math.round(paymentSummary.totalPrice).toLocaleString("cs-CZ")} Kč
                        </p>
                      </div>
                      <div className="p-4 rounded-lg bg-green-500/10 text-center">
                        <p className="text-sm text-muted-foreground">Zaplaceno</p>
                        <p className="text-xl font-bold font-mono text-green-600">
                          {Math.round(paymentSummary.paidAmount).toLocaleString("cs-CZ")} Kč
                        </p>
                      </div>
                      <div className="p-4 rounded-lg bg-orange-500/10 text-center">
                        <p className="text-sm text-muted-foreground">Zbývá</p>
                        <p className="text-xl font-bold font-mono text-orange-600">
                          {Math.round(paymentSummary.remainingAmount).toLocaleString("cs-CZ")} Kč
                        </p>
                      </div>
                    </div>

                    {/* Payment Status */}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">Stav platby:</span>
                        <span className={`font-medium ${
                          paymentSummary.paymentStatus === "PAID" ? "text-green-600" :
                          paymentSummary.paymentStatus === "PARTIAL" ? "text-orange-600" :
                          "text-red-600"
                        }`}>
                          {RESERVATION_PAYMENT_STATUS_LABELS[paymentSummary.paymentStatus]}
                        </span>
                      </div>
                      {paymentSummary.paymentMethod && (
                        <span className="text-sm text-muted-foreground">
                          Způsob: {RESERVATION_PAYMENT_METHOD_LABELS[paymentSummary.paymentMethod]}
                        </span>
                      )}
                    </div>

                    {/* Quick Actions */}
                    {!paymentSummary.isFullyPaid && (
                      <div className="space-y-3">
                        <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                          Rychlé akce
                        </Label>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setInvoiceDialogType("DEPOSIT");
                              setInvoiceDialogPercent(25);
                              setInvoiceDialogOpen(true);
                            }}
                          >
                            <Receipt className="w-4 h-4 mr-2" />
                            Záloha 25%
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setInvoiceDialogType("DEPOSIT");
                              setInvoiceDialogPercent(50);
                              setInvoiceDialogOpen(true);
                            }}
                          >
                            <Receipt className="w-4 h-4 mr-2" />
                            Záloha 50%
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setInvoiceDialogType("FINAL");
                              setInvoiceDialogOpen(true);
                            }}
                          >
                            <FileText className="w-4 h-4 mr-2" />
                            Ostrá faktura
                          </Button>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => markPaidMutation.mutate({ paymentMethod: "CASH" })}
                            disabled={isAnyInvoiceMutationPending}
                          >
                            {markPaidMutation.isPending ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Banknote className="w-4 h-4 mr-2" />
                            )}
                            Hotově zaplaceno
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => markPaidMutation.mutate({ paymentMethod: "BANK_TRANSFER" })}
                            disabled={isAnyInvoiceMutationPending}
                          >
                            <CreditCard className="w-4 h-4 mr-2" />
                            Převod zaplacen
                          </Button>
                        </div>
                      </div>
                    )}

                    {paymentSummary.isFullyPaid && (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 text-green-600">
                        <CheckCircle className="w-5 h-5" />
                        <span className="font-medium">Rezervace je plně zaplacena</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="border-t my-4" />

                {/* Invoices List */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      Vystavené faktury
                    </Label>
                  </div>

                  {invoicesLoading ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : invoices && invoices.length > 0 ? (
                    <div className="space-y-2">
                      {invoices.map((invoice) => (
                        <div key={invoice.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium font-mono text-sm">{invoice.invoiceNumber}</p>
                              {invoice.invoiceType && (
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                  invoice.invoiceType === "DEPOSIT" ? "bg-blue-100 text-blue-700" :
                                  invoice.invoiceType === "FINAL" ? "bg-purple-100 text-purple-700" :
                                  "bg-gray-100 text-gray-700"
                                }`}>
                                  {INVOICE_TYPE_LABELS[invoice.invoiceType]}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Vystaveno: {dayjs(invoice.issueDate).format("DD.MM.YYYY")} | Splatnost: {dayjs(invoice.dueDate).format("DD.MM.YYYY")}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <p className="font-mono font-medium">
                              {Math.round(parseFloat(invoice.total)).toLocaleString("cs-CZ")} {invoice.currency}
                            </p>
                            <StatusBadge status={invoice.status} type="invoice" />
                            {invoice.status !== "PAID" && invoice.status !== "CANCELLED" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => markInvoicePaidMutation.mutate(invoice.id)}
                                disabled={markInvoicePaidMutation.isPending}
                              >
                                {markInvoicePaidMutation.isPending ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <CheckCircle className="w-4 h-4" />
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Žádné faktury pro tuto rezervaci
                    </p>
                  )}
                </div>
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
