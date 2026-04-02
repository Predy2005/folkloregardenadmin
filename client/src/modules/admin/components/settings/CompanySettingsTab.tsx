import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";
import { Separator } from "@/shared/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import { Building2, Loader2, Search } from "lucide-react";
import { successToast, errorToast } from "@/shared/lib/toast-helpers";
import { smartCompanySearch, parseCompanyData, type CompanySearchResult } from "@modules/contacts/utils/companySearch";
import type { SettingsTabProps } from "./types";
import type { CompanySettings } from "@shared/types";

interface CompanySettingsTabProps extends SettingsTabProps {
  setFormData: React.Dispatch<React.SetStateAction<Partial<CompanySettings>>>;
}

export function CompanySettingsTab({ formData, handleChange, setFormData }: CompanySettingsTabProps) {
  const [aresQuery, setAresQuery] = useState("");
  const [aresResults, setAresResults] = useState<CompanySearchResult[]>([]);
  const [aresLoading, setAresLoading] = useState(false);
  const [aresOpen, setAresOpen] = useState(false);

  const handleAresSearch = async () => {
    if (aresQuery.length < 2) return;
    setAresLoading(true);
    try {
      const result = await smartCompanySearch(aresQuery);
      setAresResults(result.results);
    } catch (error) {
      console.error("ARES search failed:", error);
      errorToast("Chyba při vyhledávání v ARES");
    } finally {
      setAresLoading(false);
    }
  };

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
    successToast("Údaje načteny z ARES");
  };

  return (
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
  );
}
