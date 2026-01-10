import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { queryClient } from "@/shared/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Switch } from "@/shared/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Separator } from "@/shared/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import { Building2, CreditCard, FileText, Save, Loader2, Search } from "lucide-react";
import { useToast } from "@/shared/hooks/use-toast";
import { searchCompanies, parseCompanyData, type CompanySearchResult } from "@modules/contacts/utils/companySearch";
import type { CompanySettings } from "@shared/types";

export default function Settings() {
  const { toast } = useToast();
  const [formData, setFormData] = useState<Partial<CompanySettings>>({});

  // ARES search state
  const [aresQuery, setAresQuery] = useState("");
  const [aresResults, setAresResults] = useState<CompanySearchResult[]>([]);
  const [aresLoading, setAresLoading] = useState(false);
  const [aresOpen, setAresOpen] = useState(false);

  // Fetch settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ["/api/company-settings"],
    queryFn: () => api.get<CompanySettings>("/api/company-settings"),
  });

  // Update form when data loads
  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: Partial<CompanySettings>) =>
      api.put<CompanySettings>("/api/company-settings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company-settings"] });
      toast({ title: "Nastavení bylo úspěšně uloženo" });
    },
    onError: () => {
      toast({ title: "Chyba při ukládání nastavení", variant: "destructive" });
    },
  });

  const handleChange = (field: keyof CompanySettings, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  // ARES search
  const handleAresSearch = async () => {
    if (aresQuery.length < 2) return;
    setAresLoading(true);
    try {
      const results = await searchCompanies(aresQuery);
      setAresResults(results);
    } catch (error) {
      console.error("ARES search failed:", error);
      toast({ title: "Chyba při vyhledávání v ARES", variant: "destructive" });
    } finally {
      setAresLoading(false);
    }
  };

  // Select from ARES
  const handleSelectAres = (result: CompanySearchResult) => {
    const parsed = parseCompanyData(result);
    setFormData((prev) => ({
      ...prev,
      companyName: parsed.name,
      street: parsed.street,
      city: parsed.city,
      zipcode: parsed.zip,
      ico: parsed.ico,
      dic: parsed.dic || "",
      registrationInfo: parsed.registrationInfo || prev.registrationInfo,
    }));
    setAresOpen(false);
    setAresQuery("");
    setAresResults([]);
    toast({ title: "Údaje načteny z ARES" });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
          Nastavení
        </h1>
        <p className="text-muted-foreground mt-1">
          Nastavení firmy, fakturace a bankovních údajů
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Tabs defaultValue="company" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="company" className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Firma
            </TabsTrigger>
            <TabsTrigger value="bank" className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Bankovní údaje
            </TabsTrigger>
            <TabsTrigger value="invoice" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Fakturace
            </TabsTrigger>
          </TabsList>

          {/* Company Tab */}
          <TabsContent value="company">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Údaje o firmě</CardTitle>
                    <CardDescription>
                      Základní informace o vaší firmě zobrazené na fakturách
                    </CardDescription>
                  </div>
                  <Popover open={aresOpen} onOpenChange={setAresOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Building2 className="w-4 h-4 mr-2" />
                        Načíst z ARES
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-96 p-4" align="end">
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
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Název firmy *</Label>
                    <Input
                      id="companyName"
                      value={formData.companyName || ""}
                      onChange={(e) => handleChange("companyName", e.target.value)}
                      placeholder="Folklore Garden s.r.o."
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ico">IČO *</Label>
                    <Input
                      id="ico"
                      value={formData.ico || ""}
                      onChange={(e) => handleChange("ico", e.target.value)}
                      placeholder="28480988"
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="dic">DIČ</Label>
                    <Input
                      id="dic"
                      value={formData.dic || ""}
                      onChange={(e) => handleChange("dic", e.target.value)}
                      placeholder="CZ28480988"
                    />
                  </div>
                  <div className="flex items-center space-x-2 pt-8">
                    <Switch
                      id="isVatPayer"
                      checked={formData.isVatPayer ?? true}
                      onCheckedChange={(checked) => handleChange("isVatPayer", checked)}
                    />
                    <Label htmlFor="isVatPayer">Plátce DPH</Label>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="street">Ulice a č.p. *</Label>
                  <Input
                    id="street"
                    value={formData.street || ""}
                    onChange={(e) => handleChange("street", e.target.value)}
                    placeholder="Na Zlíchově 18"
                    required
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="city">Město *</Label>
                    <Input
                      id="city"
                      value={formData.city || ""}
                      onChange={(e) => handleChange("city", e.target.value)}
                      placeholder="Praha"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zipcode">PSČ *</Label>
                    <Input
                      id="zipcode"
                      value={formData.zipcode || ""}
                      onChange={(e) => handleChange("zipcode", e.target.value)}
                      placeholder="15200"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Země</Label>
                    <Input
                      id="country"
                      value={formData.country || ""}
                      onChange={(e) => handleChange("country", e.target.value)}
                      placeholder="Česká republika"
                    />
                  </div>
                </div>

                <Separator />

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email || ""}
                      onChange={(e) => handleChange("email", e.target.value)}
                      placeholder="info@folkloregarden.cz"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefon</Label>
                    <Input
                      id="phone"
                      value={formData.phone || ""}
                      onChange={(e) => handleChange("phone", e.target.value)}
                      placeholder="+420 123 456 789"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="web">Web</Label>
                    <Input
                      id="web"
                      value={formData.web || ""}
                      onChange={(e) => handleChange("web", e.target.value)}
                      placeholder="https://folkloregarden.cz"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="registrationInfo">Zápis v rejstříku</Label>
                  <Input
                    id="registrationInfo"
                    value={formData.registrationInfo || ""}
                    onChange={(e) => handleChange("registrationInfo", e.target.value)}
                    placeholder="Zapsáno v OR u MS v Praze, oddíl C, vložka 12345"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bank Tab */}
          <TabsContent value="bank">
            <Card>
              <CardHeader>
                <CardTitle>Bankovní údaje</CardTitle>
                <CardDescription>
                  Informace pro platby a QR kódy na fakturách
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="bankAccount">Číslo účtu</Label>
                    <Input
                      id="bankAccount"
                      value={formData.bankAccount || ""}
                      onChange={(e) => handleChange("bankAccount", e.target.value)}
                      placeholder="123456789"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bankCode">Kód banky</Label>
                    <Input
                      id="bankCode"
                      value={formData.bankCode || ""}
                      onChange={(e) => handleChange("bankCode", e.target.value)}
                      placeholder="0100"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bankName">Název banky</Label>
                  <Input
                    id="bankName"
                    value={formData.bankName || ""}
                    onChange={(e) => handleChange("bankName", e.target.value)}
                    placeholder="Komerční banka"
                  />
                </div>

                <Separator />

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="iban">IBAN</Label>
                    <Input
                      id="iban"
                      value={formData.iban || ""}
                      onChange={(e) => handleChange("iban", e.target.value)}
                      placeholder="CZ65 0800 0000 1920 0014 5399"
                    />
                    <p className="text-xs text-muted-foreground">
                      IBAN se používá pro generování QR kódů pro platbu
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="swift">SWIFT/BIC</Label>
                    <Input
                      id="swift"
                      value={formData.swift || ""}
                      onChange={(e) => handleChange("swift", e.target.value)}
                      placeholder="KOMBCZPP"
                    />
                  </div>
                </div>

                {formData.fullBankAccount && (
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Plné číslo účtu:</p>
                    <p className="font-mono text-lg">{formData.fullBankAccount}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Invoice Tab */}
          <TabsContent value="invoice">
            <div className="space-y-6">
              {/* Ostré faktury */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                    Ostré faktury
                  </CardTitle>
                  <CardDescription>
                    Číselná řada pro finální/doplatové faktury
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="invoicePrefix">Prefix</Label>
                      <Input
                        id="invoicePrefix"
                        value={formData.invoicePrefix || ""}
                        onChange={(e) => handleChange("invoicePrefix", e.target.value)}
                        placeholder="FG"
                      />
                      <p className="text-xs text-muted-foreground">
                        Např. FG2025000001
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="invoiceNextNumber">Další číslo</Label>
                      <Input
                        id="invoiceNextNumber"
                        type="number"
                        min="1"
                        value={formData.invoiceNextNumber || 1}
                        onChange={(e) => handleChange("invoiceNextNumber", parseInt(e.target.value))}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Zálohové faktury */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    Zálohové faktury
                  </CardTitle>
                  <CardDescription>
                    Samostatná číselná řada pro zálohové faktury
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="depositInvoicePrefix">Prefix</Label>
                      <Input
                        id="depositInvoicePrefix"
                        value={formData.depositInvoicePrefix || ""}
                        onChange={(e) => handleChange("depositInvoicePrefix", e.target.value)}
                        placeholder="ZF"
                      />
                      <p className="text-xs text-muted-foreground">
                        Např. ZF2025000001
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="depositInvoiceNextNumber">Další číslo</Label>
                      <Input
                        id="depositInvoiceNextNumber"
                        type="number"
                        min="1"
                        value={formData.depositInvoiceNextNumber || 1}
                        onChange={(e) => handleChange("depositInvoiceNextNumber", parseInt(e.target.value))}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Obecné nastavení */}
              <Card>
                <CardHeader>
                  <CardTitle>Obecné nastavení</CardTitle>
                  <CardDescription>
                    Společná nastavení pro všechny typy faktur
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="invoiceDueDays">Splatnost (dny)</Label>
                      <Input
                        id="invoiceDueDays"
                        type="number"
                        min="1"
                        value={formData.invoiceDueDays || 14}
                        onChange={(e) => handleChange("invoiceDueDays", parseInt(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="defaultVatRate">Výchozí sazba DPH (%)</Label>
                      <Input
                        id="defaultVatRate"
                        type="number"
                        min="0"
                        max="100"
                        value={formData.defaultVatRate || 21}
                        onChange={(e) => handleChange("defaultVatRate", parseInt(e.target.value))}
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label htmlFor="invoiceFooterText">Patička faktury</Label>
                    <Textarea
                      id="invoiceFooterText"
                      value={formData.invoiceFooterText || ""}
                      onChange={(e) => handleChange("invoiceFooterText", e.target.value)}
                      placeholder="Děkujeme za Vaši návštěvu Folklore Garden!"
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground">
                      Text zobrazený v dolní části faktury
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end mt-6">
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Uložit nastavení
          </Button>
        </div>
      </form>
    </div>
  );
}
