import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Separator } from "@/shared/components/ui/separator";
import type { SettingsTabProps } from "./types";

export function BankSettingsTab({ formData, handleChange }: SettingsTabProps) {
  return (
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
  );
}
