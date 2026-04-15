import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import dayjs from "dayjs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { Separator } from "@/shared/components/ui/separator";
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
import { Plus, Trash2, FileText } from "lucide-react";
import { successToast } from "@/shared/lib/toast-helpers";
import { formatCurrency } from "@/shared/lib/formatting";
import type { InvoiceItem, Reservation } from "@shared/types";
import type { InvoiceFormData } from "@modules/invoices/types";

const emptyItem: InvoiceItem = {
  description: "",
  quantity: 1,
  unitPrice: 0,
  total: 0,
};

interface InvoiceItemsEditorProps {
  formData: InvoiceFormData;
  onFormChange: (updater: (prev: InvoiceFormData) => InvoiceFormData) => void;
  subtotal: number;
  vatAmount: number;
  total: number;
  disableItems?: boolean;
  currency?: string;
}

export default function InvoiceItemsEditor({
  formData,
  onFormChange,
  subtotal,
  vatAmount,
  total,
  disableItems,
  currency,
}: InvoiceItemsEditorProps) {
  const cur = currency || formData.currency || "CZK";
  // Reservation selection state
  const [reservationOpen, setReservationOpen] = useState(false);
  const [reservationSearch, setReservationSearch] = useState("");

  // Fetch reservations
  const { data: reservations } = useQuery({
    queryKey: ["/api/reservations"],
    queryFn: () => api.get<Reservation[]>("/api/reservations"),
  });

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
      onFormChange((prev) => ({
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
      onFormChange((prev) => ({
        ...prev,
        variableSymbol: String(reservation.id),
        items,
      }));
    }

    setReservationOpen(false);
    successToast("Položky načteny z rezervace");
  };

  // Update a single item field
  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    onFormChange((prev) => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };
      // Recalculate total
      items[index].total = items[index].quantity * items[index].unitPrice;
      return { ...prev, items };
    });
  };

  // Add new empty item
  const addItem = () => {
    onFormChange((prev) => ({
      ...prev,
      items: [...prev.items, { ...emptyItem }],
    }));
  };

  // Remove item by index
  const removeItem = (index: number) => {
    onFormChange((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  return (
    <>
      {/* Items section */}
      <fieldset disabled={disableItems} className="contents">
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
                                {formatCurrency(reservation.persons
                                  ?.reduce((sum, p) => sum + (Number(p.price) || 0), 0), cur)}
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
                    {formatCurrency(item.total, cur)}
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
                <span className="font-mono">{formatCurrency(subtotal, cur)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">DPH {formData.vatRate}%</span>
                <span className="font-mono">{formatCurrency(vatAmount, cur)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Celkem</span>
                <span className="font-mono text-lg">
                  {formatCurrency(total, formData.currency)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      </fieldset>

      {/* Note */}
      <Card>
        <CardHeader>
          <CardTitle>Poznámka</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={formData.note}
            onChange={(e) => onFormChange((prev) => ({ ...prev, note: e.target.value }))}
            placeholder="Poznámka k faktuře (bude zobrazena na faktuře)..."
            rows={3}
          />
        </CardContent>
      </Card>
    </>
  );
}
