import { useState } from "react";
import { Loader2, UserPlus, Plus, Minus } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/shared/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { api } from "@/shared/lib/api";
import { queryClient } from "@/shared/lib/queryClient";
import { successToast, errorToast } from "@/shared/lib/toast-helpers";
import { formatCurrency } from "@/shared/lib/formatting";

interface QuickAddGuestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: number;
  eventDate: string;
}

interface MenuOption {
  id: number;
  menuName: string;
  pricePerUnit: number | null;
}

interface QuickReservationData {
  eventId: number;
  contactName: string;
  nationality: string;
  adultCount: number;
  childCount: number;
  menuId: number | null;
  pricePerAdult: number;
  pricePerChild: number;
  totalPrice: number;
  paymentMethod: string;
  isPaid: boolean;
}

const NATIONALITIES = [
  { code: "CZ", label: "Cesko" },
  { code: "SK", label: "Slovensko" },
  { code: "EN", label: "Anglie" },
  { code: "DE", label: "Nemecko" },
  { code: "CN", label: "Cina" },
  { code: "RU", label: "Rusko" },
  { code: "ES", label: "Spanelsko" },
  { code: "FR", label: "Francie" },
  { code: "IT", label: "Italie" },
  { code: "JP", label: "Japonsko" },
  { code: "KR", label: "Korea" },
  { code: "PL", label: "Polsko" },
  { code: "US", label: "USA" },
  { code: "OTHER", label: "Ostatni" },
];

const PAYMENT_METHODS = [
  { value: "CASH", label: "Hotove" },
  { value: "CARD", label: "Kartou" },
  { value: "VOUCHER", label: "Voucher" },
  { value: "UNPAID", label: "Nezaplaceno" },
];

export function QuickAddGuestDialog({
  open,
  onOpenChange,
  eventId,
  eventDate,
}: QuickAddGuestDialogProps) {
  // Form state
  const [contactName, setContactName] = useState("");
  const [nationality, setNationality] = useState("CZ");
  const [adultCount, setAdultCount] = useState(1);
  const [childCount, setChildCount] = useState(0);
  const [menuId, setMenuId] = useState<string>("");
  const [pricePerAdult, setPricePerAdult] = useState("990");
  const [pricePerChild, setPricePerChild] = useState("490");
  const [paymentMethod, setPaymentMethod] = useState("CASH");

  // Fetch available menus for this event
  const { data: menus } = useQuery<MenuOption[]>({
    queryKey: ["/api/events", eventId, "available-menus"],
    queryFn: () => api.get(`/api/events/${eventId}/available-menus`),
    enabled: open,
  });

  // Create quick reservation mutation
  const createMutation = useMutation({
    mutationFn: async (data: QuickReservationData) => {
      return api.post(`/api/events/${eventId}/quick-reservation`, data);
    },
    onSuccess: (data: { reservationId: number; guestsCreated: number }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "manager-dashboard"] });
      successToast(`Pridano ${data.guestsCreated} hostu`);
      resetForm();
      onOpenChange(false);
    },
    onError: () => {
      errorToast("Nepodarilo se pridat hosty");
    },
  });

  const resetForm = () => {
    setContactName("");
    setNationality("CZ");
    setAdultCount(1);
    setChildCount(0);
    setMenuId("");
    setPricePerAdult("990");
    setPricePerChild("490");
    setPaymentMethod("CASH");
  };

  const totalGuests = adultCount + childCount;
  const adultTotal = adultCount * parseFloat(pricePerAdult || "0");
  const childTotal = childCount * parseFloat(pricePerChild || "0");
  const totalPrice = adultTotal + childTotal;

  const handleSubmit = () => {
    if (totalGuests === 0) {
      errorToast("Zadejte alespon jednoho hosta");
      return;
    }

    createMutation.mutate({
      eventId,
      contactName: contactName || `Walk-in ${new Date().toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" })}`,
      nationality,
      adultCount,
      childCount,
      menuId: menuId ? parseInt(menuId, 10) : null,
      pricePerAdult: parseFloat(pricePerAdult || "0"),
      pricePerChild: parseFloat(pricePerChild || "0"),
      totalPrice,
      paymentMethod,
      isPaid: paymentMethod !== "UNPAID",
    });
  };

  const adjustCount = (type: "adult" | "child", delta: number) => {
    if (type === "adult") {
      setAdultCount((prev) => Math.max(0, prev + delta));
    } else {
      setChildCount((prev) => Math.max(0, prev + delta));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Rychle pridat hosty
          </DialogTitle>
          <DialogDescription>
            Pridejte walk-in hosty na akci {eventDate}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Contact name (optional) */}
          <div className="space-y-2">
            <Label htmlFor="contactName">Jmeno (volitelne)</Label>
            <Input
              id="contactName"
              placeholder="Napr. Novak"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
            />
          </div>

          {/* Guest counts */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Dospeli</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-10 w-10"
                  onClick={() => adjustCount("adult", -1)}
                  disabled={adultCount === 0}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <div className="flex-1 text-center text-2xl font-bold">
                  {adultCount}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-10 w-10"
                  onClick={() => adjustCount("adult", 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Deti</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-10 w-10"
                  onClick={() => adjustCount("child", -1)}
                  disabled={childCount === 0}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <div className="flex-1 text-center text-2xl font-bold">
                  {childCount}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-10 w-10"
                  onClick={() => adjustCount("child", 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Nationality */}
          <div className="space-y-2">
            <Label htmlFor="nationality">Narodnost</Label>
            <Select value={nationality} onValueChange={setNationality}>
              <SelectTrigger id="nationality">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NATIONALITIES.map((nat) => (
                  <SelectItem key={nat.code} value={nat.code}>
                    {nat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Menu selection */}
          <div className="space-y-2">
            <Label htmlFor="menu">Menu / Jidlo</Label>
            <Select value={menuId} onValueChange={setMenuId}>
              <SelectTrigger id="menu">
                <SelectValue placeholder="Vyberte menu" />
              </SelectTrigger>
              <SelectContent>
                {menus && menus.length > 0 ? (
                  menus.map((menu) => (
                    <SelectItem key={menu.id} value={String(menu.id)}>
                      {menu.menuName}
                      {menu.pricePerUnit && ` (${menu.pricePerUnit} Kc)`}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="0">Standard menu</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Prices */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priceAdult">Cena dospely (Kc)</Label>
              <Input
                id="priceAdult"
                type="number"
                min="0"
                step="10"
                value={pricePerAdult}
                onChange={(e) => setPricePerAdult(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="priceChild">Cena dite (Kc)</Label>
              <Input
                id="priceChild"
                type="number"
                min="0"
                step="10"
                value={pricePerChild}
                onChange={(e) => setPricePerChild(e.target.value)}
              />
            </div>
          </div>

          {/* Payment method */}
          <div className="space-y-2">
            <Label htmlFor="payment">Platba</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger id="payment">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((method) => (
                  <SelectItem key={method.value} value={method.value}>
                    {method.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Total summary */}
          <div className="rounded-lg bg-muted p-4 space-y-1">
            <div className="flex justify-between text-sm">
              <span>Dospeli ({adultCount}x):</span>
              <span className="font-medium">{formatCurrency(adultTotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Deti ({childCount}x):</span>
              <span className="font-medium">{formatCurrency(childTotal)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold mt-2 pt-2 border-t">
              <span>Celkem ({totalGuests}):</span>
              <span className="text-primary">{formatCurrency(totalPrice)}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Zrusit
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createMutation.isPending || totalGuests === 0}
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Pridavam...
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                Pridat {totalGuests} {totalGuests === 1 ? "hosta" : "hostu"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
