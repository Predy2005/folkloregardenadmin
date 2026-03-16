import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import type { InvoiceFormData } from "@modules/invoices/types";

interface InvoiceMetaSidebarProps {
  formData: InvoiceFormData;
  onFormChange: (updater: (prev: InvoiceFormData) => InvoiceFormData) => void;
  isNew: boolean;
}

export default function InvoiceMetaSidebar({ formData, onFormChange, isNew }: InvoiceMetaSidebarProps) {
  const updateField = (field: keyof InvoiceFormData, value: string | number) => {
    onFormChange((prev) => ({ ...prev, [field]: value }));
  };

  return (
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
              onChange={(e) => updateField("invoiceNumber", e.target.value)}
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
            onChange={(e) => updateField("issueDate", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="taxableDate">Datum uskutečnění</Label>
          <Input
            id="taxableDate"
            type="date"
            value={formData.taxableDate}
            onChange={(e) => updateField("taxableDate", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="dueDate">Datum splatnosti</Label>
          <Input
            id="dueDate"
            type="date"
            value={formData.dueDate}
            onChange={(e) => updateField("dueDate", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="variableSymbol">Variabilní symbol</Label>
          <Input
            id="variableSymbol"
            value={formData.variableSymbol}
            onChange={(e) => updateField("variableSymbol", e.target.value)}
            placeholder="Např. ID rezervace"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="vatRate">Sazba DPH (%)</Label>
          <Select
            value={String(formData.vatRate)}
            onValueChange={(v) => updateField("vatRate", parseInt(v))}
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
            onValueChange={(v) => updateField("status", v)}
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
  );
}
