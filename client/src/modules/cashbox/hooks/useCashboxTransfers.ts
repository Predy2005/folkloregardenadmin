import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { queryClient } from "@/shared/lib/queryClient";
import { successToast, errorToast } from "@/shared/lib/toast-helpers";
import type { CashboxTransfer } from "@shared/types";

function invalidateTransfers() {
  queryClient.invalidateQueries({ queryKey: ["/api/cashbox/transfers"] });
  queryClient.invalidateQueries({ queryKey: ["/api/cashbox/main"] });
  queryClient.invalidateQueries({ queryKey: ["/api/cashbox/main/movements"] });
  queryClient.invalidateQueries({ queryKey: ["/api/cashbox"] });
}

export function useAllTransfers() {
  return useQuery<CashboxTransfer[]>({
    queryKey: ["/api/cashbox/transfers"],
    queryFn: () => api.get<CashboxTransfer[]>("/api/cashbox/transfers/all"),
  });
}

export function usePendingTransfers() {
  return useQuery<CashboxTransfer[]>({
    queryKey: ["/api/cashbox/transfers", "pending"],
    queryFn: () => api.get<CashboxTransfer[]>("/api/cashbox/transfers/pending"),
  });
}

export function useTransferToEvent() {
  return useMutation({
    mutationFn: (data: { eventId: number; amount: number; description?: string }) =>
      api.post("/api/cashbox/main/transfer-to-event", data),
    onSuccess: () => {
      invalidateTransfers();
      successToast("Převod vytvořen, čeká na potvrzení manažerem");
    },
    onError: (e: Error) => errorToast(e),
  });
}
