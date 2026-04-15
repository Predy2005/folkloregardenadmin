import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Check, DollarSign } from "lucide-react";
import { api } from "@/shared/lib/api";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Badge } from "@/shared/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/shared/components/ui/sheet";
import { Separator } from "@/shared/components/ui/separator";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import { useToast } from "@/shared/hooks/use-toast";
import { useIsTouchDevice } from "@/hooks/use-mobile";
import { formatCurrency } from "@/shared/lib/formatting";
import { useCurrency } from "@/shared/contexts/CurrencyContext";
import { CurrencySelect } from "@/shared/components/CurrencySelect";
import type { EventTable, EventGuest, TableExpense, TableExpenseCategory } from "@shared/types";

interface TableDetailPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  table: EventTable | null;
  guests: EventGuest[];
  eventId: number;
  onUnassignGuest: (guestId: number) => void;
}

export function TableDetailPopover({
  isOpen, onClose, table, guests, eventId, onUnassignGuest,
}: TableDetailPopoverProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const isTouch = useIsTouchDevice();
  const { defaultCurrency } = useCurrency();
  const [newDesc, setNewDesc] = useState("");
  const [newQty, setNewQty] = useState(1);
  const [newPrice, setNewPrice] = useState("");
  const [newCategory, setNewCategory] = useState<TableExpenseCategory>("other");

  const { data: expenses = [] } = useQuery<TableExpense[]>({
    queryKey: ["table-expenses", eventId, table?.id],
    queryFn: () => api.get(`/api/events/${eventId}/tables/${table!.id}/expenses`),
    enabled: !!table?.id,
  });

  const addExpense = useMutation({
    mutationFn: (data: { description: string; quantity: number; unitPrice: number; category?: string }) => api.post(`/api/events/${eventId}/tables/${table!.id}/expenses`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["table-expenses", eventId, table?.id] });
      setNewDesc("");
      setNewQty(1);
      setNewPrice("");
      toast({ title: "Položka přidána" });
    },
  });

  const deleteExpense = useMutation({
    mutationFn: (expenseId: number) => api.delete(`/api/events/${eventId}/expenses/${expenseId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["table-expenses", eventId, table?.id] }),
    onError: () => toast({ title: "Chyba při mazání položky", variant: "destructive" }),
  });

  const settleTable = useMutation({
    mutationFn: () => api.post(`/api/events/${eventId}/tables/${table!.id}/expenses/settle`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["table-expenses", eventId, table?.id] });
      toast({ title: "Účet vyrovnán" });
    },
    onError: () => toast({ title: "Chyba při vyrovnání účtu", variant: "destructive" }),
  });

  if (!table) return null;

  const tableGuests = guests.filter((g) => g.eventTableId === table.id);
  const total = expenses.reduce((sum, e) => sum + e.totalPrice, 0);
  const unpaid = expenses.filter((e) => !e.isPaid).reduce((sum, e) => sum + e.totalPrice, 0);

  const handleAddExpense = () => {
    const price = parseFloat(newPrice);
    if (!newDesc.trim() || isNaN(price) || price <= 0 || newQty < 1) {
      toast({ title: "Vyplňte popis a platnou cenu", variant: "destructive" });
      return;
    }
    addExpense.mutate({ description: newDesc, category: newCategory, quantity: newQty, unitPrice: price });
  };

  const categoryLabels: Record<TableExpenseCategory, string> = {
    food: "Jídlo",
    drink: "Nápoj",
    service: "Služba",
    other: "Ostatní",
  };

  const inputH = isTouch ? "h-10" : "h-8";
  const btnH = isTouch ? "h-10 min-w-[44px]" : "h-8";

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side={isTouch ? "bottom" : "right"}
        className={isTouch ? "h-[70vh] w-full rounded-t-xl" : "w-[400px] sm:max-w-[400px]"}
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {table.tableName}
            <Badge variant="outline">{tableGuests.length}/{table.capacity}</Badge>
            {unpaid > 0 && (
              <Button variant="outline" size="sm" className={btnH} onClick={() => settleTable.mutate()} disabled={settleTable.isPending}>
                <Check className="h-3 w-3 mr-1" />
                Vyrovnat ({formatCurrency(unpaid, defaultCurrency)})
              </Button>
            )}
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className={isTouch ? "h-[calc(70vh-80px)] mt-3" : "h-[calc(100vh-80px)] mt-4"}>
          {/* Guests section */}
          <div className="space-y-2 mb-4">
            <Label className="text-xs uppercase text-muted-foreground">Hosté u stolu</Label>
            {tableGuests.length === 0 && <p className="text-sm text-muted-foreground">Nikdo</p>}
            {tableGuests.map((g) => (
              <div key={g.id} className={`flex items-center justify-between text-sm p-2 rounded bg-muted/50 ${isTouch ? "min-h-[44px]" : ""}`}>
                <div>
                  <span className="font-medium">
                    {g.firstName || g.lastName ? `${g.firstName ?? ""} ${g.lastName ?? ""}` : `Host #${g.id}`}
                  </span>
                  <div className="flex gap-1 mt-0.5">
                    {g.nationality && <Badge variant="outline" className="text-[10px]">{g.nationality}</Badge>}
                    {g.type && <Badge variant="secondary" className="text-[10px]">{g.type === "adult" ? "Dospělý" : "Dítě"}</Badge>}
                    {g.isPaid && <Badge className="text-[10px] bg-green-100 text-green-800">Placeno</Badge>}
                  </div>
                </div>
                <Button variant="ghost" size="sm" className={btnH} onClick={() => onUnassignGuest(g.id)}>
                  Odebrat
                </Button>
              </div>
            ))}
          </div>

          <Separator className="my-4" />

          {/* Expenses section */}
          <div className="space-y-3">
            <Label className="text-xs uppercase text-muted-foreground">Výdaje / Účet</Label>

            {/* Add expense form — stacked on touch, grid on desktop */}
            {isTouch ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input placeholder="Popis" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} className={`flex-1 ${inputH} text-sm`} />
                  <Select value={newCategory} onValueChange={(v) => setNewCategory(v as TableExpenseCategory)}>
                    <SelectTrigger className={`w-24 ${inputH} text-xs`}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(categoryLabels).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Input type="number" min={1} value={newQty} onChange={(e) => setNewQty(Math.max(1, parseInt(e.target.value) || 1))} className={`w-16 ${inputH} text-sm`} placeholder="Ks" />
                  <Input type="number" min={0.01} step="0.01" placeholder="Cena" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} className={`flex-1 ${inputH} text-sm`} />
                  <CurrencySelect value={defaultCurrency} onChange={() => {}} className="w-20" />
                  <Button className={`${btnH} px-4`} onClick={handleAddExpense} disabled={addExpense.isPending}>
                    <Plus className="h-4 w-4 mr-1" /> Přidat
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-5">
                  <Input placeholder="Popis" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} className="h-8 text-sm" />
                </div>
                <div className="col-span-2">
                  <Select value={newCategory} onValueChange={(v) => setNewCategory(v as TableExpenseCategory)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(categoryLabels).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-1">
                  <Input type="number" min={1} value={newQty} onChange={(e) => setNewQty(Math.max(1, parseInt(e.target.value) || 1))} className="h-8 text-sm" />
                </div>
                <div className="col-span-2">
                  <Input type="number" min={0.01} step="0.01" placeholder="Cena" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} className="h-8 text-sm" />
                </div>
                <div className="col-span-2">
                  <Button size="sm" className="h-8 w-full" onClick={handleAddExpense} disabled={addExpense.isPending}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}

            {/* Expense list */}
            <div className="space-y-1">
              {expenses.map((expense) => (
                <div key={expense.id} className={`flex items-center justify-between text-sm p-2 rounded bg-muted/30 ${isTouch ? "min-h-[44px]" : ""}`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span>{expense.description}</span>
                      <Badge variant="outline" className="text-[10px]">{categoryLabels[expense.category]}</Badge>
                      {expense.isPaid && <Badge className="text-[10px] bg-green-100 text-green-800">Zaplaceno</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {expense.quantity}x {formatCurrency(expense.unitPrice, defaultCurrency)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{formatCurrency(expense.totalPrice, defaultCurrency)}</span>
                    <Button variant="ghost" size="icon" className={isTouch ? "h-10 w-10" : "h-6 w-6"} onClick={() => deleteExpense.mutate(expense.id)}>
                      <Trash2 className={isTouch ? "h-4 w-4 text-destructive" : "h-3 w-3 text-destructive"} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Total */}
            {expenses.length > 0 && (
              <div className="flex items-center justify-between font-semibold text-sm p-2 border-t">
                <div className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  Celkem
                </div>
                <span>{formatCurrency(total, defaultCurrency)}</span>
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
