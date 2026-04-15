import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';
import { queryClient } from '@/shared/lib/queryClient';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import type { PricingDefault, PricingDateOverride } from '@shared/types';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { successToast, errorToast } from '@/shared/lib/toast-helpers';
import { useCurrency } from '@/shared/contexts/CurrencyContext';
import { CurrencySelect } from '@/shared/components/CurrencySelect';
import { useFormDialog } from '@/shared/hooks/useFormDialog';
import { useCrudMutations } from '@/shared/hooks/useCrudMutations';
import { PageHeader } from "@/shared/components/PageHeader";
import { useAuth } from "@/modules/auth/contexts/AuthContext";
import { DefaultPricesForm } from '../components/pricing/DefaultPricesForm';
import { OverridesTable } from '../components/pricing/OverridesTable';
import { OverrideDialog } from '../components/pricing/OverrideDialog';

const defaultPriceSchema = z.object({
  adultPrice: z.number().min(0, 'Cena musí být kladné číslo'),
  childPrice: z.number().min(0, 'Cena musí být kladné číslo'),
  infantPrice: z.number().min(0, 'Cena musí být kladné číslo'),
  includeMeal: z.boolean(),
});

const dateOverrideSchema = z.object({
  date: z.string().min(1, 'Datum je povinné'),
  adultPrice: z.number().min(0, 'Cena musí být kladné číslo'),
  childPrice: z.number().min(0, 'Cena musí být kladné číslo'),
  infantPrice: z.number().min(0, 'Cena musí být kladné číslo'),
  includeMeal: z.boolean(),
  reason: z.string().optional(),
});

type DefaultPriceForm = z.infer<typeof defaultPriceSchema>;
type DateOverrideForm = z.infer<typeof dateOverrideSchema>;

export default function Pricing() {
  const { isSuperAdmin } = useAuth();
  const { defaultCurrency } = useCurrency();
  const dialog = useFormDialog<PricingDateOverride>();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOverrideIds, setSelectedOverrideIds] = useState<Set<number>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const { data: defaultPrices, isLoading: isLoadingDefaults } = useQuery({
    queryKey: ['/api/pricing/defaults'],
    queryFn: () => api.get<PricingDefault>('/api/pricing/defaults'),
  });

  const { data: dateOverrides, isLoading: isLoadingOverrides } = useQuery({
    queryKey: ['/api/pricing/date-overrides'],
    queryFn: () => api.get<PricingDateOverride[]>('/api/pricing/date-overrides'),
  });

  const defaultForm = useForm<DefaultPriceForm>({
    resolver: zodResolver(defaultPriceSchema),
    values: {
      adultPrice: defaultPrices?.adultPrice ?? 0,
      childPrice: defaultPrices?.childPrice ?? 0,
      infantPrice: defaultPrices?.infantPrice ?? 0,
      includeMeal: defaultPrices?.includeMeal ?? false,
    },
  });

  const overrideForm = useForm<DateOverrideForm>({
    resolver: zodResolver(dateOverrideSchema),
    defaultValues: { date: '', adultPrice: 0, childPrice: 0, infantPrice: 0, includeMeal: false, reason: '' },
  });

  const updateDefaultMutation = useMutation({
    mutationFn: (data: DefaultPriceForm) => api.put('/api/pricing/defaults', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['/api/pricing/defaults'] }); successToast('Výchozí ceny byly úspěšně aktualizovány'); },
    onError: (error: Error) => errorToast(error),
  });

  const { createMutation: createOverrideMutation, updateMutation: updateOverrideMutation, deleteMutation: deleteOverrideMutation } = useCrudMutations<DateOverrideForm>({
    endpoint: '/api/pricing/date-overrides',
    queryKey: ['/api/pricing/date-overrides'],
    entityName: 'Cenový přepis',
    onCreateSuccess: () => { dialog.close(); overrideForm.reset(); },
    onUpdateSuccess: () => { dialog.close(); overrideForm.reset(); },
  });

  const handleCreateOverride = () => {
    overrideForm.reset({
      date: '', adultPrice: defaultPrices?.adultPrice ?? 0, childPrice: defaultPrices?.childPrice ?? 0,
      infantPrice: defaultPrices?.infantPrice ?? 0, includeMeal: defaultPrices?.includeMeal ?? false, reason: '',
    });
    dialog.openCreate();
  };

  const handleEditOverride = (override: PricingDateOverride) => {
    overrideForm.reset({
      date: override.date, adultPrice: override.adultPrice, childPrice: override.childPrice,
      infantPrice: override.infantPrice, includeMeal: override.includeMeal, reason: override.reason || '',
    });
    dialog.openEdit(override);
  };

  const handleDeleteOverride = (id: number) => {
    if (confirm('Opravdu chcete smazat tento cenový přepis?')) deleteOverrideMutation.mutate(id);
  };

  const onSubmitOverride = (data: DateOverrideForm) => {
    if (dialog.editingItem) updateOverrideMutation.mutate({ id: dialog.editingItem.id, data });
    else createOverrideMutation.mutate(data);
  };

  const bulkDeleteOverrideMutation = useMutation({
    mutationFn: async (ids: number[]) => await api.delete('/api/pricing/date-overrides/bulk-delete', { data: { ids } }),
    onSuccess: (data: { count?: number }) => { queryClient.invalidateQueries({ queryKey: ['/api/pricing/date-overrides'] }); setSelectedOverrideIds(new Set()); setBulkDeleteOpen(false); successToast(`Smazáno ${data?.count ?? ''} cenových přepisů`); },
    onError: (error: Error) => errorToast(error),
  });

  const toggleOverrideSelection = (id: number) => {
    setSelectedOverrideIds((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  const toggleAllOverrides = (overrides: PricingDateOverride[]) => {
    if (selectedOverrideIds.size === overrides.length) setSelectedOverrideIds(new Set());
    else setSelectedOverrideIds(new Set(overrides.map((o) => o.id)));
  };

  const filteredOverrides = dateOverrides?.filter((override) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return override.date.includes(searchLower) || override.reason?.toLowerCase().includes(searchLower);
  });

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Cenník" description="Nastavení cen rezervací na osobu podle typu">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Měna:</span>
          <CurrencySelect value={defaultCurrency} onChange={() => {}} className="w-24" />
        </div>
      </PageHeader>

      <DefaultPricesForm
        form={defaultForm} defaultCurrency={defaultCurrency}
        isLoading={isLoadingDefaults} isPending={updateDefaultMutation.isPending}
        onSubmit={(data) => updateDefaultMutation.mutate(data)}
      />

      <OverridesTable
        overrides={dateOverrides} filteredOverrides={filteredOverrides}
        isLoading={isLoadingOverrides} searchTerm={searchTerm} setSearchTerm={setSearchTerm}
        defaultCurrency={defaultCurrency} isSuperAdmin={isSuperAdmin}
        selectedOverrideIds={selectedOverrideIds}
        onToggleOverrideSelection={toggleOverrideSelection} onToggleAllOverrides={toggleAllOverrides}
        onBulkDeleteOpen={() => setBulkDeleteOpen(true)} onClearSelection={() => setSelectedOverrideIds(new Set())}
        onCreateOverride={handleCreateOverride} onEditOverride={handleEditOverride} onDeleteOverride={handleDeleteOverride}
      />

      <OverrideDialog
        isOpen={dialog.isOpen} setIsOpen={dialog.setIsOpen} isEditing={dialog.isEditing}
        form={overrideForm} defaultCurrency={defaultCurrency}
        isPending={createOverrideMutation.isPending || updateOverrideMutation.isPending}
        onSubmit={onSubmitOverride} onClose={() => dialog.close()}
      />

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Smazat vybrané cenové přepisy</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Opravdu chcete smazat {selectedOverrideIds.size} vybraných cenových přepisů? Tuto akci nelze vrátit zpět.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDeleteOpen(false)}>Zrušit</Button>
            <Button
              variant="destructive"
              onClick={() => bulkDeleteOverrideMutation.mutate(Array.from(selectedOverrideIds))}
              disabled={bulkDeleteOverrideMutation.isPending}
            >
              {bulkDeleteOverrideMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Smazat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
