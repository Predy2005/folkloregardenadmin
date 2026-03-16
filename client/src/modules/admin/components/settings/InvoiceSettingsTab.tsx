import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Separator } from "@/shared/components/ui/separator";
import type { SettingsTabProps } from "./types";

export function InvoiceSettingsTab({ formData, handleChange }: SettingsTabProps) {
  return (
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
  );
}
