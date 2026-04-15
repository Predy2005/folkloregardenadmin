import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { StockItem } from "@shared/types";
import { api } from "@/shared/lib/api";
import { queryClient } from "@/shared/lib/queryClient";
import { successToast, errorToast } from "@/shared/lib/toast-helpers";
import { useLocation } from "wouter";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Badge } from "@/shared/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { PageHeader } from "@/shared/components/PageHeader";
import { Search, ArrowLeft, Package, Loader2 } from "lucide-react";

interface ReceiptItem {
  stockItemId: number;
  name: string;
  unit: string;
  currentQty: number;
  addQty: number;
}

export default function StockReceiving() {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [receiptItems, setReceiptItems] = useState<ReceiptItem[]>([]);
  const [supplier, setSupplier] = useState("");

  const { data: stockItems } = useQuery<StockItem[]>({
    queryKey: ["/api/stock-items"],
    queryFn: () => api.get<StockItem[]>("/api/stock-items"),
  });

  const filteredItems =
    stockItems?.filter(
      (item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.supplier || "").toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

  const addToReceipt = (item: StockItem) => {
    setReceiptItems((prev) => {
      const existing = prev.find((r) => r.stockItemId === item.id);
      if (existing) {
        return prev.map((r) =>
          r.stockItemId === item.id ? { ...r, addQty: r.addQty + 1 } : r
        );
      }
      return [
        ...prev,
        {
          stockItemId: item.id,
          name: item.name,
          unit: item.unit,
          currentQty: item.quantityAvailable,
          addQty: 1,
        },
      ];
    });
  };

  const batchMutation = useMutation({
    mutationFn: () =>
      api.post("/api/stock-movements/batch", {
        movements: receiptItems.map((r) => ({
          stockItemId: r.stockItemId,
          movementType: "IN",
          quantity: r.addQty,
          reason: supplier ? `Příjem od: ${supplier}` : "Příjem zboží",
        })),
        supplier,
      }),
    onSuccess: (data: { count: number }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/stock-items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stock-movements"] });
      successToast(`Přijato ${data.count} položek`);
      setReceiptItems([]);
      setSupplier("");
    },
    onError: (e: Error) => errorToast(e),
  });

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-4">
      {/* Header */}
      <PageHeader title="Příjem zboží" description="Rychlé naskladnění">
        <Button variant="outline" onClick={() => navigate("/stock-items")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Zpět na sklad
        </Button>
      </PageHeader>

      {/* Supplier input */}
      <Card>
        <CardContent className="pt-4">
          <Label className="text-base">Dodavatel</Label>
          <Input
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
            placeholder="Název dodavatele..."
            className="text-lg h-12 mt-2"
          />
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Hledat položku..."
          className="pl-12 text-lg h-14 rounded-xl"
          autoFocus
        />
      </div>

      {/* Item grid - cards for touch */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {filteredItems.slice(0, 30).map((item) => {
          const inReceipt = receiptItems.find(
            (r) => r.stockItemId === item.id
          );
          return (
            <Card
              key={item.id}
              className={`cursor-pointer active:scale-95 transition-transform ${
                inReceipt
                  ? "ring-2 ring-primary bg-primary/5"
                  : "hover:bg-muted/50"
              }`}
              onClick={() => addToReceipt(item)}
            >
              <CardContent className="p-4">
                <p className="font-medium text-base truncate">{item.name}</p>
                <p className="text-sm text-muted-foreground">{item.unit}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm">
                    Sklad: {item.quantityAvailable}
                  </span>
                  {inReceipt && (
                    <Badge className="text-base px-3 py-1">
                      +{inReceipt.addQty}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Receipt summary - sticky bottom */}
      {receiptItems.length > 0 && (
        <Card className="sticky bottom-4 shadow-lg border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between">
              <span>Příjemka ({receiptItems.length} položek)</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReceiptItems([])}
              >
                Vymazat vše
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {receiptItems.map((item) => (
              <div
                key={item.stockItemId}
                className="flex items-center justify-between p-2 bg-muted rounded-lg"
              >
                <div className="flex-1">
                  <span className="font-medium">{item.name}</span>
                  <span className="text-sm text-muted-foreground ml-2">
                    ({item.unit})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {/* Decrement button */}
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10"
                    onClick={() =>
                      setReceiptItems((prev) =>
                        prev
                          .map((r) =>
                            r.stockItemId === item.stockItemId
                              ? { ...r, addQty: Math.max(0, r.addQty - 1) }
                              : r
                          )
                          .filter((r) => r.addQty > 0)
                      )
                    }
                  >
                    -
                  </Button>
                  {/* Quantity input */}
                  <Input
                    type="number"
                    value={item.addQty}
                    onChange={(e) => {
                      const val = Math.max(
                        0,
                        parseInt(e.target.value) || 0
                      );
                      setReceiptItems((prev) =>
                        prev
                          .map((r) =>
                            r.stockItemId === item.stockItemId
                              ? { ...r, addQty: val }
                              : r
                          )
                          .filter((r) => r.addQty > 0)
                      );
                    }}
                    className="w-20 text-center text-lg h-10"
                  />
                  {/* Increment button */}
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10"
                    onClick={() =>
                      setReceiptItems((prev) =>
                        prev.map((r) =>
                          r.stockItemId === item.stockItemId
                            ? { ...r, addQty: r.addQty + 1 }
                            : r
                        )
                      )
                    }
                  >
                    +
                  </Button>
                  {/* Quick add buttons */}
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-10"
                    onClick={() =>
                      setReceiptItems((prev) =>
                        prev.map((r) =>
                          r.stockItemId === item.stockItemId
                            ? { ...r, addQty: r.addQty + 5 }
                            : r
                        )
                      )
                    }
                  >
                    +5
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-10"
                    onClick={() =>
                      setReceiptItems((prev) =>
                        prev.map((r) =>
                          r.stockItemId === item.stockItemId
                            ? { ...r, addQty: r.addQty + 10 }
                            : r
                        )
                      )
                    }
                  >
                    +10
                  </Button>
                </div>
              </div>
            ))}
            <Button
              className="w-full h-14 text-lg mt-4"
              onClick={() => batchMutation.mutate()}
              disabled={
                batchMutation.isPending || receiptItems.length === 0
              }
            >
              {batchMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />{" "}
                  Ukládám...
                </>
              ) : (
                <>
                  <Package className="w-5 h-5 mr-2" /> Naskladnit{" "}
                  {receiptItems.length} položek
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
