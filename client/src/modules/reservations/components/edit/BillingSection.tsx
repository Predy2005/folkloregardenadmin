import type { Ref } from "react";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Checkbox } from "@/shared/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Search, Building2 } from "lucide-react";
import type { SharedContact } from "@modules/reservations/types";
import type { CompanySearchResult } from "@modules/contacts/utils/companySearch";
import { parseCompanyData } from "@modules/contacts/utils/companySearch";

export interface BillingSectionProps {
  sharedContact: SharedContact;
  setSharedContact: React.Dispatch<React.SetStateAction<SharedContact>>;
  // Company search
  companyQuery: string;
  setCompanyQuery: (value: string) => void;
  companyResults: CompanySearchResult[];
  isCompanyDropdownOpen: boolean;
  setIsCompanyDropdownOpen: (value: boolean) => void;
  isCompanySearching: boolean;
  companyBoxRef: Ref<HTMLDivElement>;
  applyCompanyToForm: (company: CompanySearchResult) => void;
  // Auto-invoice (create mode only)
  isEdit: boolean;
  autoCreateInvoice: boolean;
  setAutoCreateInvoice: (value: boolean) => void;
  autoInvoiceType: "DEPOSIT" | "FINAL";
  setAutoInvoiceType: (value: "DEPOSIT" | "FINAL") => void;
  autoInvoicePercent: number;
  setAutoInvoicePercent: (value: number) => void;
}

export function BillingSection({
  sharedContact,
  setSharedContact,
  companyQuery,
  setCompanyQuery,
  companyResults,
  isCompanyDropdownOpen,
  setIsCompanyDropdownOpen,
  isCompanySearching,
  companyBoxRef,
  applyCompanyToForm,
  isEdit,
  autoCreateInvoice,
  setAutoCreateInvoice,
  autoInvoiceType,
  setAutoInvoiceType,
  autoInvoicePercent,
  setAutoInvoicePercent,
}: BillingSectionProps) {
  return (
    <div className="space-y-4">
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
                            {parsed.dic && ` \u2022 DIČ: ${parsed.dic}`}
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
    </div>
  );
}
