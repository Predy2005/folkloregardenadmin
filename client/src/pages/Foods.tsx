import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Edit, Trash2 } from 'lucide-react';
import type { ReservationFood } from '@shared/types';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/hooks/use-toast';

const foodSchema = z.object({
  name: z.string().min(1, 'Název je povinný'),
  description: z.string().optional(),
  price: z.coerce.number().min(0, 'Cena musí být kladné číslo'),
  isChildrenMenu: z.boolean().default(false),
});

type FoodForm = z.infer<typeof foodSchema>;

export default function Foods() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFood, setEditingFood] = useState<ReservationFood | null>(null);
  const { toast } = useToast();

  const { data: foods, isLoading } = useQuery({
    queryKey: ['/api/reservation-foods'],
    queryFn: () => api.get<ReservationFood[]>('/api/reservation-foods'),
  });

  const form = useForm<FoodForm>({
    resolver: zodResolver(foodSchema),
    defaultValues: {
      name: '',
      description: '',
      price: 0,
      isChildrenMenu: false,
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: FoodForm) => api.post('/api/reservation-foods', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reservation-foods'] });
      setIsDialogOpen(false);
      form.reset();
      toast({ title: 'Jídlo bylo úspěšně vytvořeno' });
    },
    onError: () => {
      toast({ title: 'Chyba při vytváření jídla', variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: FoodForm }) =>
      api.put(`/api/reservation-foods/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reservation-foods'] });
      setIsDialogOpen(false);
      setEditingFood(null);
      form.reset();
      toast({ title: 'Jídlo bylo úspěšně upraveno' });
    },
    onError: () => {
      toast({ title: 'Chyba při úpravě jídla', variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/reservation-foods/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reservation-foods'] });
      toast({ title: 'Jídlo bylo úspěšně smazáno' });
    },
    onError: () => {
      toast({ title: 'Chyba při mazání jídla', variant: 'destructive' });
    },
  });

  const handleCreate = () => {
    setEditingFood(null);
    form.reset({
      name: '',
      description: '',
      price: 0,
      isChildrenMenu: false,
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (food: ReservationFood) => {
    setEditingFood(food);
    form.reset({
      name: food.name,
      description: food.description || '',
      price: food.price,
      isChildrenMenu: food.isChildrenMenu,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm('Opravdu chcete smazat toto jídlo?')) {
      deleteMutation.mutate(id);
    }
  };

  const onSubmit = (data: FoodForm) => {
    if (editingFood) {
      updateMutation.mutate({ id: editingFood.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Načítání jídel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold mb-2">Jídla</h1>
          <p className="text-muted-foreground">Správa menu a jídel</p>
        </div>
        <Button onClick={handleCreate} data-testid="button-create-food" className="bg-gradient-to-r from-primary to-purple-600">
          <Plus className="w-4 h-4 mr-2" />
          Přidat jídlo
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Název</TableHead>
                  <TableHead>Popis</TableHead>
                  <TableHead>Cena</TableHead>
                  <TableHead>Dětské menu</TableHead>
                  <TableHead className="text-right">Akce</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {foods?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Žádná jídla
                    </TableCell>
                  </TableRow>
                ) : (
                  foods?.map((food) => (
                    <TableRow key={food.id} className="hover-elevate" data-testid={`row-food-${food.id}`}>
                      <TableCell className="font-mono text-sm">#{food.id}</TableCell>
                      <TableCell className="font-medium">{food.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">
                        {food.description || '-'}
                      </TableCell>
                      <TableCell className="font-mono font-medium">{food.price} Kč</TableCell>
                      <TableCell>
                        {food.isChildrenMenu && (
                          <span className="inline-flex items-center rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 px-2 py-1 text-xs font-medium border border-blue-500/30">
                            Dětské
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(food)}
                            data-testid={`button-edit-${food.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(food.id)}
                            className="text-destructive hover:text-destructive"
                            data-testid={`button-delete-${food.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif">
              {editingFood ? 'Upravit jídlo' : 'Nové jídlo'}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Název</FormLabel>
                    <FormControl>
                      <Input placeholder="Např. Standardní menu" data-testid="input-food-name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Popis</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Popis jídla..."
                        data-testid="input-food-description"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cena (Kč)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        data-testid="input-food-price"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isChildrenMenu"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-children-menu"
                      />
                    </FormControl>
                    <FormLabel className="font-normal cursor-pointer">
                      Dětské menu
                    </FormLabel>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Zrušit
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-food"
                  className="bg-gradient-to-r from-primary to-purple-600"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? 'Ukládání...'
                    : editingFood
                    ? 'Uložit změny'
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
