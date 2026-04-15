import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/shared/components/ui/card";
import { EyeOff, Eye } from "lucide-react";
import { PageHeader } from "@/shared/components/PageHeader";
import { Label } from "@/shared/components/ui/label";
import { api } from "@/shared/lib/api";
import { invalidateCashboxQueries } from "@/shared/lib/query-helpers";
import { queryClient } from "@/shared/lib/queryClient";
import { successToast, errorToast } from "@/shared/lib/toast-helpers";

interface CashboxInitFormProps {
  isHidden: boolean;
  isSuperAdmin: boolean;
}

export function CashboxInitForm({ isHidden, isSuperAdmin }: CashboxInitFormProps) {
  const [amount, setAmount] = useState("");

  const initMutation = useMutation({
    mutationFn: (initialBalance: number) => api.post("/api/cashbox/main", { initialBalance }),
    onSuccess: () => { invalidateCashboxQueries(); successToast("Hlavní kasa inicializována"); },
    onError: (e: Error) => errorToast(e),
  });

  const unhideMutation = useMutation({
    mutationFn: () => api.post("/api/cashbox/main/unhide"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cashbox/main/hidden-status"] });
      invalidateCashboxQueries();
      successToast("Hlavní kasa odkryta");
    },
    onError: (e: Error) => errorToast(e),
  });

  if (isHidden) {
    return (
      <div className="p-6 space-y-6">
        <PageHeader title="Hlavní kasa" description="Globální pokladna firmy" />
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <EyeOff className="w-5 h-5" />
              Kasa je skrytá
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Hlavní kasa byla nouzově skryta. Pro zobrazení je potřeba ji odkrýt.
            </p>
            {isSuperAdmin && (
              <Button onClick={() => unhideMutation.mutate()} disabled={unhideMutation.isPending}>
                <Eye className="w-4 h-4 mr-2" /> Odkrýt hlavní kasu
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Hlavní kasa" description="Globální pokladna firmy" />
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Inicializace hlavní kasy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Hlavní kasa ještě nebyla vytvořena. Zadejte počáteční stav.
          </p>
          <div>
            <Label>Počáteční stav</Label>
            <Input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <Button
            onClick={() => initMutation.mutate(parseFloat(amount) || 0)}
            disabled={initMutation.isPending}
          >
            Vytvořit hlavní kasu
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
