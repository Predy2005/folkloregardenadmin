import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Separator } from "@/shared/components/ui/separator";
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
import { Loader2, Search, Building2, Users } from "lucide-react";
import { searchCompanies, parseCompanyData, type CompanySearchResult } from "@modules/contacts/utils/companySearch";
import type { Contact } from "@shared/types";
import type { InvoiceFormData } from "@modules/invoices/types";

interface CustomerSectionProps {
  formData: InvoiceFormData;
  onFormChange: (updater: (prev: InvoiceFormData) => InvoiceFormData) => void;
}

export default function CustomerSection({ formData, onFormChange }: CustomerSectionProps) {
  // ARES search state
  const [aresQuery, setAresQuery] = useState("");
  const [aresResults, setAresResults] = useState<CompanySearchResult[]>([]);
  const [aresLoading, setAresLoading] = useState(false);
  const [aresOpen, setAresOpen] = useState(false);

  // Contact selection state
  const [contactOpen, setContactOpen] = useState(false);
  const [contactSearch, setContactSearch] = useState("");

  // Fetch contacts
  const { data: contactsData } = useQuery({
    queryKey: ["/api/contacts/all"],
    queryFn: async () => {
      const res = await api.get<{ items: Contact[]; total: number }>("/api/contacts?limit=10000");
      return res.items;
    },
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

  // ARES search handler
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

  // Select company from ARES results
  const handleSelectAres = (result: CompanySearchResult) => {
    const parsed = parseCompanyData(result);
    onFormChange((prev) => ({
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

  // Select from contacts list
  const handleSelectContact = (contact: Contact) => {
    onFormChange((prev) => ({
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

  const updateField = (field: keyof InvoiceFormData, value: string) => {
    onFormChange((prev) => ({ ...prev, [field]: value }));
  };

  return (
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
              onChange={(e) => updateField("customerName", e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="customerCompany">Firma</Label>
            <Input
              id="customerCompany"
              value={formData.customerCompany}
              onChange={(e) => updateField("customerCompany", e.target.value)}
            />
          </div>
          <div className="sm:col-span-2 space-y-2">
            <Label htmlFor="customerStreet">Ulice</Label>
            <Input
              id="customerStreet"
              value={formData.customerStreet}
              onChange={(e) => updateField("customerStreet", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="customerCity">Město</Label>
            <Input
              id="customerCity"
              value={formData.customerCity}
              onChange={(e) => updateField("customerCity", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="customerZipcode">PSČ</Label>
            <Input
              id="customerZipcode"
              value={formData.customerZipcode}
              onChange={(e) => updateField("customerZipcode", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="customerIco">IČO</Label>
            <Input
              id="customerIco"
              value={formData.customerIco}
              onChange={(e) => updateField("customerIco", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="customerDic">DIČ</Label>
            <Input
              id="customerDic"
              value={formData.customerDic}
              onChange={(e) => updateField("customerDic", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="customerEmail">E-mail</Label>
            <Input
              id="customerEmail"
              type="email"
              value={formData.customerEmail}
              onChange={(e) => updateField("customerEmail", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="customerPhone">Telefon</Label>
            <Input
              id="customerPhone"
              value={formData.customerPhone}
              onChange={(e) => updateField("customerPhone", e.target.value)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
