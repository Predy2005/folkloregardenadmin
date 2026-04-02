import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { successToast, errorToast } from "@/shared/lib/toast-helpers";
import { queryClient } from "@/shared/lib/queryClient";
import { api } from "@/shared/lib/api";
import { GUEST_TYPE_LABELS } from "./constants";
import { NationalityInput } from "@/shared/components/NationalityInput";
import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Label } from "@/shared/components/ui/label";
import { Loader2, Plus } from "lucide-react";

export interface BulkAddCardProps {
  eventId: number;
}

export default function BulkAddCard({ eventId }: BulkAddCardProps) {
  const [bulkCount, setBulkCount] = useState<number>(1);
  const [bulkType, setBulkType] = useState<string>("adult");
  const [bulkNationality, setBulkNationality] = useState<string>("");
  const [bulkIsPaid, setBulkIsPaid] = useState<boolean>(true);

  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "guests"] });
    queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
  };

  const bulkCreateMutation = useMutation({
    mutationFn: async (data: {
      count: number;
      type: string;
      nationality?: string;
      isPaid: boolean;
    }) => {
      return await api.post(`/api/events/${eventId}/guests/bulk`, data);
    },
    onSuccess: (data: any) => {
      invalidateQueries();
      successToast(`Přidáno ${data.count} hostů`);
      setBulkCount(1);
    },
    onError: (error: Error) => {
      errorToast(error);
    },
  });

  const handleBulkAdd = () => {
    if (bulkCount < 1) {
      errorToast("Zadejte platný počet");
      return;
    }
    bulkCreateMutation.mutate({
      count: bulkCount,
      type: bulkType,
      nationality: bulkNationality || undefined,
      isPaid: bulkIsPaid,
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Hromadné přidání hostů
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
          <div>
            <Label className="text-xs">Počet</Label>
            <Input
              type="number"
              min={1}
              max={500}
              value={bulkCount}
              onChange={(e) => setBulkCount(Number(e.target.value))}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">Typ</Label>
            <Select value={bulkType} onValueChange={setBulkType}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(GUEST_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Národnost</Label>
            <NationalityInput
              value={bulkNationality}
              onChange={setBulkNationality}
              placeholder="např. CZ"
              className="mt-1"
            />
          </div>
          <div className="flex items-center gap-2 pt-5">
            <Checkbox
              checked={bulkIsPaid}
              onCheckedChange={(checked) => setBulkIsPaid(Boolean(checked))}
            />
            <Label className="text-xs">Platící</Label>
          </div>
          <div className="md:col-span-2">
            <Button
              onClick={handleBulkAdd}
              disabled={bulkCreateMutation.isPending}
              className="w-full"
            >
              {bulkCreateMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Přidat {bulkCount} hostů
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
