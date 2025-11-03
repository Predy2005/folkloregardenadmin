import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Plus, Edit, Trash2, Calculator, Users } from 'lucide-react';
import type { StaffingFormula, StaffingCategory } from '@shared/types';
import { STAFFING_CATEGORY_LABELS } from '@shared/types';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

const staffingFormulaSchema = z.object({
  category: z.enum([
    'cisniciWaiters',
    'kuchariChefs',
    'pomocneSilyHelpers',
    'moderatoriHosts',
    'muzikantiMusicians',
    'tanecniciDancers',
    'fotografkyPhotographers',
    'sperkyJewelry',
  ] as const, { required_error: 'Vyberte kategorii' }),
  ratio: z.coerce.number().min(1, 'Poměr musí být alespoň 1'),
  enabled: z.boolean().default(true),
  description: z.string().optional(),
});

type StaffingFormulaForm = z.infer<typeof staffingFormulaSchema>;

export default function StaffingFormulas() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFormula, setEditingFormula] = useState<StaffingFormula | null>(null);
  const { toast } = useToast();

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

  const createMutation = useMutation({
    mutationFn: (data: StaffingFormulaForm) => api.post('/api/staffing-formulas', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/staffing-formulas'] });
      setIsDialogOpen(false);
      form.reset();
      toast({ title: 'Vzorec byl úspěšně vytvořen' });
    },
    onError: () => {
      toast({ title: 'Chyba při vytváření vzorce', variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: StaffingFormulaForm }) =>
      api.put(`/api/staffing-formulas/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/staffing-formulas'] });
      setIsDialogOpen(false);
      setEditingFormula(null);
      form.reset();
      toast({ title: 'Vzorec byl úspěšně upraven' });
    },
    onError: () => {
      toast({ title: 'Chyba při úpravě vzorce', variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/staffing-formulas/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/staffing-formulas'] });
      toast({ title: 'Vzorec byl úspěšně smazán' });
    },
    onError: () => {
      toast({ title: 'Chyba při mazání vzorce', variant: 'destructive' });
    },
  });

  const toggleEnabledMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: number; enabled: boolean }) =>
      api.put(`/api/staffing-formulas/${id}`, { enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/staffing-formulas'] });
      toast({ title: 'Vzorec byl aktualizován' });
    },
    onError: () => {
      toast({ title: 'Chyba při aktualizaci vzorce', variant: 'destructive' });
    },
  });

  const handleCreate = () => {
    setEditingFormula(null);
    form.reset({
      category: 'cisniciWaiters',
      ratio: 25,
      enabled: true,
      description: '',
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (formula: StaffingFormula) => {
    setEditingFormula(formula);
    form.reset({
      category: formula.category,
      ratio: formula.ratio,
      enabled: formula.enabled,
      description: formula.description || '',
    });
    setIsDialogOpen(true);
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
    if (editingFormula) {
      updateMutation.mutate({ id: editingFormula.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  // Group formulas by enabled status
  const activeFormulas = formulas?.filter(f => f.enabled) || [];
  const inactiveFormulas = formulas?.filter(f => !f.enabled) || [];

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            Výpočetní vzorce personálu
          </h1>
          <p className="text-muted-foreground mt-1">
            Nastavení automatických výpočtů potřebného personálu pro akce
          </p>
        </div>
        <Button
          onClick={handleCreate}
          className="bg-gradient-to-r from-primary to-purple-600"
          data-testid="button-create-formula"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nový vzorec
        </Button>
      </div>

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
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingFormula ? 'Upravit vzorec' : 'Nový vzorec'}
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
                      disabled={!!editingFormula}
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
                    {editingFormula && (
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
                  onClick={() => setIsDialogOpen(false)}
                  data-testid="button-cancel"
                >
                  Zrušit
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="bg-gradient-to-r from-primary to-purple-600"
                  data-testid="button-submit"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? 'Ukládání...'
                    : editingFormula
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
