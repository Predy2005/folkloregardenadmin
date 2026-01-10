import { useState, useEffect, useMemo } from "react";
import { useLocation, useParams } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { queryClient } from "@/shared/lib/queryClient";
import dayjs from "dayjs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Separator } from "@/shared/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/shared/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import {
  ArrowLeft,
  Save,
  Loader2,
  Search,
  Plus,
  Trash2,
  Building2,
  Users,
  FileText,
} from "lucide-react";
import { useToast } from "@/shared/hooks/use-toast";
import { searchCompanies, parseCompanyData, type CompanySearchResult } from "@modules/contacts/utils/companySearch";
import type { Invoice, InvoiceItem, Contact, Reservation, CompanySettings } from "@shared/types";

interface InvoiceFormData {
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  taxableDate: string;
  status: string;
  // Customer
  customerName: string;
  customerCompany: string;
  customerStreet: string;
  customerCity: string;
  customerZipcode: string;
  customerIco: string;
  customerDic: string;
  customerEmail: string;
  customerPhone: string;
  // Items & totals
  items: InvoiceItem[];
  vatRate: number;
  currency: string;
  variableSymbol: string;
  note: string;
}

const emptyItem: InvoiceItem = {
  description: "",
  quantity: 1,
  unitPrice: 0,
  total: 0,
};

export default function InvoiceEdit() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const isNew = !id || id === "new";

  // Form state
  const [formData, setFormData] = useState<InvoiceFormData>({
    invoiceNumber: "",
    issueDate: dayjs().format("YYYY-MM-DD"),
    dueDate: dayjs().add(14, "day").format("YYYY-MM-DD"),
    taxableDate: dayjs().format("YYYY-MM-DD"),
    status: "DRAFT",
    customerName: "",
    customerCompany: "",
    customerStreet: "",
    customerCity: "",
    customerZipcode: "",
    customerIco: "",
    customerDic: "",
    customerEmail: "",
    customerPhone: "",
    items: [{ ...emptyItem }],
    vatRate: 21,
    currency: "CZK",
    variableSymbol: "",
    note: "",
  });

  // ARES search state
  const [aresQuery, setAresQuery] = useState("");
  const [aresResults, setAresResults] = useState<CompanySearchResult[]>([]);
  const [aresLoading, setAresLoading] = useState(false);
  const [aresOpen, setAresOpen] = useState(false);

  // Contact selection state
  const [contactOpen, setContactOpen] = useState(false);
  const [contactSearch, setContactSearch] = useState("");

  // Reservation selection state
  const [reservationOpen, setReservationOpen] = useState(false);
  const [reservationSearch, setReservationSearch] = useState("");

  // Fetch existing invoice
  const { data: invoice, isLoading: invoiceLoading } = useQuery({
    queryKey: ["/api/invoices", id],
    queryFn: () => api.get<Invoice>(`/api/invoices/${id}`),
    enabled: !isNew && !!id,
  });

  // Fetch company settings for defaults
  const { data: companySettings } = useQuery({
    queryKey: ["/api/company-settings"],
    queryFn: () => api.get<CompanySettings>("/api/company-settings"),
  });

  // Fetch contacts
  const { data: contactsData } = useQuery({
    queryKey: ["/api/contacts/all"],
    queryFn: async () => {
      const res = await api.get<{ items: Contact[]; total: number }>("/api/contacts?limit=10000");
      return res.items;
    },
  });

  // Fetch reservations
  const { data: reservations } = useQuery({
    queryKey: ["/api/reservations"],
    queryFn: () => api.get<Reservation[]>("/api/reservations"),
  });

  // Filter contacts by search
  const filteredContacts = useMemo(() => {
    if (!contactsData) return [];
    const search = contactSearch.toLowerCase();
    return contactsData.filter(
      (c) =>
        c.name.toLowerCase().includes(search) ||
        c.email?.toLowerCase().includes(search) ||
        c.company?.toLowerCase().includes(search) ||
        c.invoiceIc?.includes(search)
    );
  }, [contactsData, contactSearch]);

  // Filter reservations by search
  const filteredReservations = useMemo(() => {
    if (!reservations) return [];
    const search = reservationSearch.toLowerCase();
    return reservations
      .filter((r) => r.status !== "CANCELLED")
      .filter(
        (r) =>
          r.contactName.toLowerCase().includes(search) ||
          r.contactEmail?.toLowerCase().includes(search) ||
          String(r.id).includes(search) ||
          dayjs(r.date).format("DD.MM.YYYY").includes(search)
      );
  }, [reservations, reservationSearch]);

  // Load invoice data when editing
  useEffect(() => {
    if (invoice && !isNew) {
      setFormData({
        invoiceNumber: invoice.invoiceNumber,
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        taxableDate: invoice.taxableDate || invoice.issueDate,
        status: invoice.status,
        customerName: invoice.customer.name,
        customerCompany: invoice.customer.company || "",
        customerStreet: invoice.customer.street || "",
        customerCity: invoice.customer.city || "",
        customerZipcode: invoice.customer.zipcode || "",
        customerIco: invoice.customer.ico || "",
        customerDic: invoice.customer.dic || "",
        customerEmail: invoice.customer.email || "",
        customerPhone: invoice.customer.phone || "",
        items: invoice.items.length > 0
          ? invoice.items.map(item => ({
              ...item,
              quantity: Number(item.quantity) || 1,
              unitPrice: Number(item.unitPrice) || 0,
              total: Number(item.total) || 0,
            }))
          : [{ ...emptyItem }],
        vatRate: Number(invoice.vatRate) || 21,
        currency: invoice.currency,
        variableSymbol: invoice.variableSymbol,
        note: invoice.note || "",
      });
    }
  }, [invoice, isNew]);

  // Set default due days from company settings
  useEffect(() => {
    if (isNew && companySettings?.invoiceDueDays) {
      setFormData((prev) => ({
        ...prev,
        dueDate: dayjs().add(companySettings.invoiceDueDays, "day").format("YYYY-MM-DD"),
        vatRate: companySettings.defaultVatRate || 21,
      }));
    }
  }, [companySettings, isNew]);

  // Calculate totals
  const subtotal = formData.items.reduce((sum, item) => sum + item.total, 0);
  const vatAmount = subtotal * (formData.vatRate / 100);
  const total = subtotal + vatAmount;

  // ARES search
  const handleAresSearch = async () => {
    if (aresQuery.length < 2) return;
    setAresLoading(true);
    try {
      const results = await searchCompanies(aresQuery);
      setAresResults(results);
    } catch (error) {
      console.error("ARES search failed:", error);
    } finally {
      setAresLoading(false);
    }
  };

  // Select from ARES
  const handleSelectAres = (result: CompanySearchResult) => {
    const parsed = parseCompanyData(result);
    setFormData((prev) => ({
      ...prev,
      customerName: parsed.name,
      customerCompany: parsed.name,
      customerStreet: parsed.street,
      customerCity: parsed.city,
      customerZipcode: parsed.zip,
      customerIco: parsed.ico,
      customerDic: parsed.dic || "",
    }));
    setAresOpen(false);
    setAresQuery("");
    setAresResults([]);
  };

  // Select from contacts
  const handleSelectContact = (contact: Contact) => {
    setFormData((prev) => ({
      ...prev,
      customerName: contact.invoiceName || contact.name,
      customerCompany: contact.company || "",
      customerStreet: contact.billingStreet || "",
      customerCity: contact.billingCity || "",
      customerZipcode: contact.billingZip || "",
      customerIco: contact.invoiceIc || "",
      customerDic: contact.invoiceDic || "",
      customerEmail: contact.invoiceEmail || contact.email || "",
      customerPhone: contact.invoicePhone || contact.phone || "",
    }));
    setContactOpen(false);
  };

  // Load items from reservation
  const handleLoadFromReservation = (reservation: Reservation) => {
    const items: InvoiceItem[] = [];

    if (reservation.persons) {
      reservation.persons.forEach((person, idx) => {
        const price = Number(person.price) || 0;
        items.push({
          description: `Rezervace ${dayjs(reservation.date).format("DD.MM.YYYY")} - Osoba ${idx + 1} (${person.type})`,
          quantity: 1,
          unitPrice: price,
          total: price,
        });
      });
    }

    if (items.length === 0) {
      items.push({ ...emptyItem });
    }

    // Also load customer if not already set
    if (!formData.customerName) {
      setFormData((prev) => ({
        ...prev,
        customerName: reservation.invoiceName || reservation.contactName,
        customerCompany: reservation.invoiceCompany || "",
        customerStreet: reservation.invoiceStreet || "",
        customerCity: reservation.invoiceCity || "",
        customerZipcode: reservation.invoiceZipcode || "",
        customerIco: reservation.invoiceIc || "",
        customerDic: reservation.invoiceDic || "",
        customerEmail: reservation.invoiceEmail || reservation.contactEmail,
        customerPhone: reservation.invoicePhone || reservation.contactPhone,
        variableSymbol: String(reservation.id),
        items,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        variableSymbol: String(reservation.id),
        items,
      }));
    }

    setReservationOpen(false);
    toast({ title: "Položky načteny z rezervace" });
  };

  // Update item
  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    setFormData((prev) => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };
      // Recalculate total
      items[index].total = items[index].quantity * items[index].unitPrice;
      return { ...prev, items };
    });
  };

  // Add item
  const addItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, { ...emptyItem }],
    }));
  };

  // Remove item
  const removeItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = {
        ...data,
        subtotal: subtotal.toFixed(2),
        vatAmount: vatAmount.toFixed(2),
        total: total.toFixed(2),
      };

      if (isNew) {
        return api.post<Invoice>("/api/invoices", payload);
      } else {
        return api.put<Invoice>(`/api/invoices/${id}`, payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({ title: isNew ? "Faktura vytvořena" : "Faktura uložena" });
      navigate("/invoices");
    },
    onError: (error: Error) => {
      toast({
        title: "Chyba při ukládání",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Send invoice mutation
  const sendMutation = useMutation({
    mutationFn: async () => {
      return api.post(`/api/invoices/${id}/send-email`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({ title: "Faktura odeslána zákazníkovi" });
    },
    onError: (error: Error) => {
      toast({
        title: "Chyba při odesílání",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  if (!isNew && invoiceLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/invoices")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              {isNew ? "Nová faktura" : `Faktura ${invoice?.invoiceNumber}`}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isNew ? "Vytvoření nové faktury" : "Úprava existující faktury"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {!isNew && formData.customerEmail && (
            <Button
              variant="outline"
              onClick={() => sendMutation.mutate()}
              disabled={sendMutation.isPending}
            >
              {sendMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FileText className="w-4 h-4 mr-2" />
              )}
              Odeslat zákazníkovi
            </Button>
          )}
          <Button onClick={handleSubmit} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {isNew ? "Vytvořit fakturu" : "Uložit změny"}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left column - Invoice details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Odběratel
                </CardTitle>
                <CardDescription>
                  Načtěte z ARES, adresáře nebo zadejte ručně
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Load buttons */}
                <div className="flex gap-2 flex-wrap">
                  {/* ARES search */}
                  <Popover open={aresOpen} onOpenChange={setAresOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Building2 className="w-4 h-4 mr-2" />
                        Načíst z ARES
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-96 p-4" align="start">
                      <div className="space-y-4">
                        <div className="flex gap-2">
                          <Input
                            placeholder="IČO nebo název firmy..."
                            value={aresQuery}
                            onChange={(e) => setAresQuery(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleAresSearch()}
                          />
                          <Button
                            size="sm"
                            onClick={handleAresSearch}
                            disabled={aresLoading || aresQuery.length < 2}
                          >
                            {aresLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Search className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                        {aresResults.length > 0 && (
                          <div className="max-h-60 overflow-y-auto space-y-2">
                            {aresResults.map((result, idx) => (
                              <div
                                key={idx}
                                className="p-2 rounded-lg border hover:bg-muted cursor-pointer"
                                onClick={() => handleSelectAres(result)}
                              >
                                <p className="font-medium text-sm">{result.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  IČO: {result.ico} | {result.city}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>

                  {/* Contact selection */}
                  <Popover open={contactOpen} onOpenChange={setContactOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Users className="w-4 h-4 mr-2" />
                        Vybrat z adresáře
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-96 p-0" align="start">
                      <Command>
                        <CommandInput
                          placeholder="Hledat kontakt..."
                          value={contactSearch}
                          onValueChange={setContactSearch}
                        />
                        <CommandList>
                          <CommandEmpty>Žádný kontakt nenalezen</CommandEmpty>
                          <CommandGroup>
                            {filteredContacts.slice(0, 10).map((contact) => (
                              <CommandItem
                                key={contact.id}
                                value={contact.name}
                                onSelect={() => handleSelectContact(contact)}
                              >
                                <div className="flex flex-col">
                                  <span className="font-medium">{contact.name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {contact.email} {contact.invoiceIc && `| IČ: ${contact.invoiceIc}`}
                                  </span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <Separator />

                {/* Customer fields */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="customerName">Jméno / Název *</Label>
                    <Input
                      id="customerName"
                      value={formData.customerName}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, customerName: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customerCompany">Firma</Label>
                    <Input
                      id="customerCompany"
                      value={formData.customerCompany}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, customerCompany: e.target.value }))
                      }
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-2">
                    <Label htmlFor="customerStreet">Ulice</Label>
                    <Input
                      id="customerStreet"
                      value={formData.customerStreet}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, customerStreet: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customerCity">Město</Label>
                    <Input
                      id="customerCity"
                      value={formData.customerCity}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, customerCity: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customerZipcode">PSČ</Label>
                    <Input
                      id="customerZipcode"
                      value={formData.customerZipcode}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, customerZipcode: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customerIco">IČO</Label>
                    <Input
                      id="customerIco"
                      value={formData.customerIco}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, customerIco: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customerDic">DIČ</Label>
                    <Input
                      id="customerDic"
                      value={formData.customerDic}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, customerDic: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customerEmail">E-mail</Label>
                    <Input
                      id="customerEmail"
                      type="email"
                      value={formData.customerEmail}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, customerEmail: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customerPhone">Telefon</Label>
                    <Input
                      id="customerPhone"
                      value={formData.customerPhone}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, customerPhone: e.target.value }))
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Items section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Položky faktury</CardTitle>
                    <CardDescription>Přidejte položky ručně nebo načtěte z rezervace</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Popover open={reservationOpen} onOpenChange={setReservationOpen}>
                      <PopoverTrigger asChild>
                        <Button type="button" variant="outline" size="sm">
                          <FileText className="w-4 h-4 mr-2" />
                          Z rezervace
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-96 p-0" align="end">
                        <Command>
                          <CommandInput
                            placeholder="Hledat rezervaci (jméno, datum, ID)..."
                            value={reservationSearch}
                            onValueChange={setReservationSearch}
                          />
                          <CommandList>
                            <CommandEmpty>Žádná rezervace nenalezena</CommandEmpty>
                            <CommandGroup>
                              {filteredReservations.slice(0, 10).map((reservation) => (
                                <CommandItem
                                  key={reservation.id}
                                  value={`${reservation.id}-${reservation.contactName}`}
                                  onSelect={() => handleLoadFromReservation(reservation)}
                                >
                                  <div className="flex items-center justify-between w-full">
                                    <div className="flex flex-col">
                                      <span className="font-medium">
                                        #{reservation.id} - {reservation.contactName}
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        {dayjs(reservation.date).format("DD.MM.YYYY")} |{" "}
                                        {reservation.persons?.length || 0} osob
                                      </span>
                                    </div>
                                    <span className="font-mono text-sm">
                                      {reservation.persons
                                        ?.reduce((sum, p) => sum + (Number(p.price) || 0), 0)
                                        .toLocaleString("cs-CZ")}{" "}
                                      Kč
                                    </span>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <Button type="button" variant="outline" size="sm" onClick={addItem}>
                      <Plus className="w-4 h-4 mr-2" />
                      Přidat položku
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40%]">Popis</TableHead>
                      <TableHead className="w-[15%]">Množství</TableHead>
                      <TableHead className="w-[20%]">Cena/ks</TableHead>
                      <TableHead className="w-[15%] text-right">Celkem</TableHead>
                      <TableHead className="w-[10%]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formData.items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Input
                            value={item.description}
                            onChange={(e) => updateItem(index, "description", e.target.value)}
                            placeholder="Popis položky..."
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) =>
                              updateItem(index, "quantity", parseInt(e.target.value) || 1)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) =>
                              updateItem(index, "unitPrice", parseFloat(e.target.value) || 0)
                            }
                          />
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {item.total.toLocaleString("cs-CZ")} Kč
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeItem(index)}
                            disabled={formData.items.length === 1}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Totals */}
                <div className="flex justify-end mt-4">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Základ</span>
                      <span className="font-mono">{subtotal.toLocaleString("cs-CZ")} Kč</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">DPH {formData.vatRate}%</span>
                      <span className="font-mono">{vatAmount.toLocaleString("cs-CZ")} Kč</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-semibold">
                      <span>Celkem</span>
                      <span className="font-mono text-lg">
                        {total.toLocaleString("cs-CZ")} {formData.currency}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Note */}
            <Card>
              <CardHeader>
                <CardTitle>Poznámka</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={formData.note}
                  onChange={(e) => setFormData((prev) => ({ ...prev, note: e.target.value }))}
                  placeholder="Poznámka k faktuře (bude zobrazena na faktuře)..."
                  rows={3}
                />
              </CardContent>
            </Card>
          </div>

          {/* Right column - Invoice meta */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Údaje faktury</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!isNew && (
                  <div className="space-y-2">
                    <Label htmlFor="invoiceNumber">Číslo faktury</Label>
                    <Input
                      id="invoiceNumber"
                      value={formData.invoiceNumber}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, invoiceNumber: e.target.value }))
                      }
                      disabled
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="issueDate">Datum vystavení</Label>
                  <Input
                    id="issueDate"
                    type="date"
                    value={formData.issueDate}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, issueDate: e.target.value }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="taxableDate">Datum uskutečnění</Label>
                  <Input
                    id="taxableDate"
                    type="date"
                    value={formData.taxableDate}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, taxableDate: e.target.value }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dueDate">Datum splatnosti</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, dueDate: e.target.value }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="variableSymbol">Variabilní symbol</Label>
                  <Input
                    id="variableSymbol"
                    value={formData.variableSymbol}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, variableSymbol: e.target.value }))
                    }
                    placeholder="Např. ID rezervace"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vatRate">Sazba DPH (%)</Label>
                  <Select
                    value={String(formData.vatRate)}
                    onValueChange={(v) =>
                      setFormData((prev) => ({ ...prev, vatRate: parseInt(v) }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0% (Osvobozeno)</SelectItem>
                      <SelectItem value="12">12%</SelectItem>
                      <SelectItem value="21">21%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(v) => setFormData((prev) => ({ ...prev, status: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DRAFT">Koncept</SelectItem>
                      <SelectItem value="SENT">Odesláno</SelectItem>
                      <SelectItem value="PAID">Zaplaceno</SelectItem>
                      <SelectItem value="CANCELLED">Stornováno</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>

    </div>
  );
}
