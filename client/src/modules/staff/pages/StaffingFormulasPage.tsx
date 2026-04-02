import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';
import { queryClient } from '@/shared/lib/queryClient';
import { successToast, errorToast } from '@/shared/lib/toast-helpers';
import { useFormDialog } from '@/shared/hooks/useFormDialog';
import { useCrudMutations } from '@/shared/hooks/useCrudMutations';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/shared/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/shared/components/ui/form';
import { Plus, Edit, Trash2, Calculator, Users } from 'lucide-react';
import { PageHeader } from "@/shared/components/PageHeader";
import type { StaffingFormula, StaffingCategory } from '@shared/types';
import { STAFFING_CATEGORY_LABELS } from '@shared/types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { staffingFormulaSchema, type StaffingFormulaForm } from '../types';
import { Badge } from '@/shared/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Switch } from '@/shared/components/ui/switch';
import { Textarea } from '@/shared/components/ui/textarea';

export default function StaffingFormulas() {
  const dialog = useFormDialog<StaffingFormula>();

  const { data: formulas, isLoading } = useQuery({
    queryKey: ['/api/staffing-formulas'],
    queryFn: () => api.get<StaffingFormula[]>('/api/staffing-formulas'),
  });

  const form = useForm<StaffingFormulaForm>({
    resolver: zodResolver(staffingFormulaSchema),
    defaultValues: {
      category: 'cisniciWaiters',
      ratio: 25,
      enabled: true,
      description: '',
    },
  });

  const { createMutation, updateMutation, deleteMutation, isPending } = useCrudMutations<StaffingFormulaForm>({
    endpoint: '/api/staffing-formulas',
    queryKey: ['/api/staffing-formulas'],
    entityName: 'Vzorec',
    onCreateSuccess: () => { dialog.close(); form.reset(); },
    onUpdateSuccess: () => { dialog.close(); form.reset(); },
  });

  const toggleEnabledMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: number; enabled: boolean }) =>
      api.put(`/api/staffing-formulas/${id}`, { enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/staffing-formulas'] });
      successToast('Vzorec byl aktualizován');
    },
    onError: (error: Error) => errorToast(error),
  });

  const handleCreate = () => {
    dialog.openCreate();
    form.reset({
      category: 'cisniciWaiters',
      ratio: 25,
      enabled: true,
      description: '',
    });
  };

  const handleEdit = (formula: StaffingFormula) => {
    dialog.openEdit(formula);
    form.reset({
      category: formula.category,
      ratio: formula.ratio,
      enabled: formula.enabled,
      description: formula.description || '',
    });
  };

  const handleDelete = (id: number) => {
    if (confirm('Opravdu chcete smazat tento vzorec?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleToggleEnabled = (id: number, currentEnabled: boolean) => {
    toggleEnabledMutation.mutate({ id, enabled: !currentEnabled });
  };

  const onSubmit = (data: StaffingFormulaForm) => {
    if (dialog.editingItem) {
      updateMutation.mutate({ id: dialog.editingItem.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  // Group formulas by enabled status
  const activeFormulas = formulas?.filter(f => f.enabled) || [];
  const inactiveFormulas = formulas?.filter(f => !f.enabled) || [];

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader title="Výpočetní vzorce personálu" description="Nastavení automatických výpočtů potřebného personálu pro akce">
        <Button
          onClick={handleCreate}
          className="bg-primary hover:bg-primary/90"
          data-testid="button-create-formula"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nový vzorec
        </Button>
      </PageHeader>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Celkem vzorců</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formulas?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Aktivních</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeFormulas.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Neaktivních</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">{inactiveFormulas.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Active Formulas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Aktivní vzorce
          </CardTitle>
          <CardDescription>
            Tyto vzorce se použijí pro automatický výpočet personálu u akcí
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Načítání...</div>
          ) : activeFormulas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Zatím nejsou definovány žádné aktivní vzorce
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kategorie</TableHead>
                  <TableHead>Poměr</TableHead>
                  <TableHead>Výpočet</TableHead>
                  <TableHead>Popis</TableHead>
                  <TableHead>Stav</TableHead>
                  <TableHead className="text-right">Akce</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeFormulas.map((formula) => (
                  <TableRow key={formula.id} data-testid={`row-formula-${formula.id}`}>
                    <TableCell className="font-medium">
                      {STAFFING_CATEGORY_LABELS[formula.category]}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">1 : {formula.ratio}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      1 osoba na každých {formula.ratio} hostů
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                      {formula.description || '-'}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={formula.enabled}
                        onCheckedChange={() => handleToggleEnabled(formula.id, formula.enabled)}
                        data-testid={`switch-enabled-${formula.id}`}
                      />
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(formula)}
                        data-testid={`button-edit-${formula.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(formula.id)}
                        data-testid={`button-delete-${formula.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Inactive Formulas */}
      {inactiveFormulas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-muted-foreground">
              <Users className="w-5 h-5" />
              Neaktivní vzorce
            </CardTitle>
            <CardDescription>
              Tyto vzorce jsou dočasně vypnuté a nepoužívají se pro výpočty
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kategorie</TableHead>
                  <TableHead>Poměr</TableHead>
                  <TableHead>Popis</TableHead>
                  <TableHead>Stav</TableHead>
                  <TableHead className="text-right">Akce</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inactiveFormulas.map((formula) => (
                  <TableRow key={formula.id} className="opacity-60" data-testid={`row-formula-${formula.id}`}>
                    <TableCell className="font-medium">
                      {STAFFING_CATEGORY_LABELS[formula.category]}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">1 : {formula.ratio}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                      {formula.description || '-'}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={formula.enabled}
                        onCheckedChange={() => handleToggleEnabled(formula.id, formula.enabled)}
                        data-testid={`switch-enabled-${formula.id}`}
                      />
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(formula)}
                        data-testid={`button-edit-${formula.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(formula.id)}
                        data-testid={`button-delete-${formula.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialog.isOpen} onOpenChange={dialog.setIsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {dialog.editingItem ? 'Upravit vzorec' : 'Nový vzorec'}
            </DialogTitle>
            <DialogDescription>
              Nastavte poměr personálu vůči počtu hostů. Například "1 : 25" znamená 1 osoba na každých 25 hostů.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kategorie personálu *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={!!dialog.editingItem}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-category">
                          <SelectValue placeholder="Vyberte kategorii" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(STAFFING_CATEGORY_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {dialog.editingItem && (
                      <FormDescription>
                        Kategorie nelze měnit u existujícího vzorce
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ratio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Poměr (počet hostů na 1 osobu) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        placeholder="25"
                        data-testid="input-ratio"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      />
                    </FormControl>
                    <FormDescription>
                      Např. hodnota 25 = 1 osoba na každých 25 hostů
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="enabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Vzorec aktivní</FormLabel>
                      <FormDescription>
                        Aktivní vzorce se použijí pro automatické výpočty u akcí
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-enabled"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Popis (volitelné)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Např. 'Pro folklorní show, zahrnuje přípravu a úklid'"
                        className="min-h-20"
                        data-testid="input-description"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Doplňující informace o vzorci
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => dialog.setIsOpen(false)}
                  data-testid="button-cancel"
                >
                  Zrušit
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="bg-primary hover:bg-primary/90"
                  data-testid="button-submit"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? 'Ukládání...'
                    : dialog.editingItem
                    ? 'Uložit'
                    : 'Vytvořit'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
