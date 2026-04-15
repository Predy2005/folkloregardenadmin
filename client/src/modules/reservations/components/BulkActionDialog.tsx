import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';
import { invalidateReservationQueries } from '@/shared/lib/query-helpers';
import { successToast, errorToast } from '@/shared/lib/toast-helpers';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { RESERVATION_STATUS_LABELS } from '@shared/types';
import type { Reservation, ReservationType } from '@shared/types';
import { Loader2, AlertTriangle, Info } from 'lucide-react';

import type {
  BulkActionType,
  ReservationWarning,
  BulkActionDialogProps,
} from '@modules/reservations/types/components/common/BulkActionDialog';

export type { BulkActionType, BulkActionDialogProps };

export function BulkActionDialog({ open, onOpenChange, actionType, selectedIds, onSuccess }: BulkActionDialogProps) {
  const [selectedStatus, setSelectedStatus] = useState<Reservation['status'] | ''>('');
  const [selectedTypeId, setSelectedTypeId] = useState<string>('');

  const { data: reservationTypes } = useQuery({
    queryKey: ['/api/reservation-types'],
    queryFn: () => api.get<ReservationType[]>('/api/reservation-types'),
    enabled: actionType === 'reservationType',
  });

  // Check for warnings when deleting
  const { data: checkResult, isLoading: isChecking } = useQuery({
    queryKey: ['/api/reservations/bulk-check', Array.from(selectedIds)],
    queryFn: () => api.post<{ reservations: ReservationWarning[]; totalWithWarnings: number }>(
      '/api/reservations/bulk-check',
      { ids: Array.from(selectedIds) }
    ),
    enabled: open && actionType === 'delete' && selectedIds.size > 0,
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: (data: { ids: number[]; updates: Record<string, unknown> }) =>
      api.put('/api/reservations/bulk-update', data),
    onSuccess: () => {
      invalidateReservationQueries();
      onSuccess();
      onOpenChange(false);
      resetState();
      successToast(`Aktualizováno ${selectedIds.size} rezervací`);
    },
    onError: () => {
      errorToast('Chyba při hromadné aktualizaci rezervací');
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: number[]) =>
      api.delete('/api/reservations/bulk-delete', { data: { ids } }),
    onSuccess: () => {
      invalidateReservationQueries();
      onSuccess();
      onOpenChange(false);
      resetState();
      successToast(`Smazáno ${selectedIds.size} rezervací`);
    },
    onError: () => {
      errorToast('Chyba při hromadném mazání rezervací');
    },
  });

  const resetState = () => {
    setSelectedStatus('');
    setSelectedTypeId('');
  };

  useEffect(() => {
    if (!open) resetState();
  }, [open]);

  const handleConfirm = () => {
    const ids = Array.from(selectedIds);

    if (actionType === 'status' && selectedStatus) {
      bulkUpdateMutation.mutate({ ids, updates: { status: selectedStatus } });
    } else if (actionType === 'reservationType' && selectedTypeId) {
      bulkUpdateMutation.mutate({ ids, updates: { reservationTypeId: Number(selectedTypeId) } });
    } else if (actionType === 'delete') {
      bulkDeleteMutation.mutate(ids);
    }
  };

  const isLoading = bulkUpdateMutation.isPending || bulkDeleteMutation.isPending;

  const canConfirm =
    actionType === 'delete' ||
    (actionType === 'status' && selectedStatus !== '') ||
    (actionType === 'reservationType' && selectedTypeId !== '');

  const title = actionType === 'status'
    ? 'Změnit status'
    : actionType === 'reservationType'
      ? 'Změnit typ rezervace'
      : 'Smazat rezervace';

  const reservationWarnings = checkResult?.reservations ?? [];
  const hasWarnings = reservationWarnings.length > 0;

  const description = actionType === 'delete'
    ? `Opravdu chcete smazat ${selectedIds.size} vybraných rezervací? Tuto akci nelze vzít zpět.`
    : `Vyberte novou hodnotu pro ${selectedIds.size} vybraných rezervací.`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {actionType === 'status' && (
          <div className="py-4">
            <Select value={selectedStatus} onValueChange={(v) => setSelectedStatus(v as Reservation['status'])}>
              <SelectTrigger>
                <SelectValue placeholder="Vyberte status" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(RESERVATION_STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {actionType === 'reservationType' && (
          <div className="py-4">
            <Select value={selectedTypeId} onValueChange={setSelectedTypeId}>
              <SelectTrigger>
                <SelectValue placeholder="Vyberte typ rezervace" />
              </SelectTrigger>
              <SelectContent>
                {(reservationTypes || []).map((type) => (
                  <SelectItem key={type.id} value={String(type.id)}>
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: type.color }}
                      />
                      {type.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {actionType === 'delete' && isChecking && (
          <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Kontroluji propojení...
          </div>
        )}

        {actionType === 'delete' && hasWarnings && (
          <div className="space-y-3">
            {reservationWarnings.map((rw) => (
              <div key={rw.reservationId} className="rounded-lg border border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950 p-3 space-y-1">
                <div className="flex items-center gap-2 text-orange-700 dark:text-orange-400 font-medium text-sm">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {rw.contactName} ({rw.date})
                </div>
                <ul className="space-y-0.5 text-xs text-orange-600 dark:text-orange-300 pl-6">
                  {rw.warnings.map((w, i) => (
                    <li key={i} className="flex items-start gap-1">
                      <Info className="h-3 w-3 mt-0.5 shrink-0" />
                      {w.message}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Zrušit
          </Button>
          <Button
            variant={actionType === 'delete' ? 'destructive' : 'default'}
            onClick={handleConfirm}
            disabled={!canConfirm || isLoading || (actionType === 'delete' && isChecking)}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? 'Zpracovávám...' : actionType === 'delete' ? 'Smazat' : 'Potvrdit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
