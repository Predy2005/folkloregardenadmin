import { z } from "zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/shared/hooks/use-toast";
import { queryClient } from "@/shared/lib/queryClient";
import { api } from "@/shared/lib/api";
import type { EventGuest } from "@shared/types";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/shared/components/ui/form";
import { Input } from "@/shared/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { Badge } from "@/shared/components/ui/badge";
import { Label } from "@/shared/components/ui/label";
import { Loader2, Pencil, Plus, Trash2, Users, RefreshCw, CheckSquare } from "lucide-react";

const guestSchema = z.object({
  firstName: z.string().min(1, "Zadejte jméno"),
  lastName: z.string().optional(),
  nationality: z.string().optional(),
  type: z.enum(["adult", "child", "infant", "driver", "guide"], {
    required_error: "Vyberte typ",
  }),
  isPaid: z.boolean().default(true),
  isPresent: z.boolean().default(false),
  notes: z.string().optional(),
});

export type GuestForm = z.infer<typeof guestSchema>;

const GUEST_TYPE_LABELS: Record<string, string> = {
  adult: "Dospělý",
  child: "Dítě (3-12)",
  infant: "Batole (0-2)",
  driver: "Řidič",
  guide: "Průvodce",
};

export interface GuestsTabProps {
  eventId: number;
  eventType: string;
  guests: EventGuest[];
  isLoading: boolean;
}

export default function GuestsTab({ eventId, eventType, guests, isLoading }: GuestsTabProps) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState<EventGuest | null>(null);

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Bulk add state
  const [bulkCount, setBulkCount] = useState<number>(1);
  const [bulkType, setBulkType] = useState<string>("adult");
  const [bulkNationality, setBulkNationality] = useState<string>("");
  const [bulkIsPaid, setBulkIsPaid] = useState<boolean>(true);

  // Bulk action state
  const [bulkActionDialogOpen, setBulkActionDialogOpen] = useState(false);
  const [bulkActionType, setBulkActionType] = useState<"nationality" | "type" | "isPaid" | "isPresent" | "delete" | null>(null);
  const [bulkActionValue, setBulkActionValue] = useState<string>("");

  const isFolklorniShow = eventType === "folklorni_show";

  const form = useForm<GuestForm>({
    resolver: zodResolver(guestSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      nationality: "",
      type: "adult",
      isPaid: true,
      isPresent: false,
      notes: "",
    },
  });

  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "guests"] });
    queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
  };

  const createMutation = useMutation({
    mutationFn: async (data: GuestForm) => {
      return await api.post(`/api/events/${eventId}/guests`, data);
    },
    onSuccess: () => {
      invalidateQueries();
      toast({ title: "Úspěch", description: "Host byl přidán" });
      setDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Chyba", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: GuestForm & { id: number }) => {
      return await api.put(`/api/events/${eventId}/guests/${data.id}`, data);
    },
    onSuccess: () => {
      invalidateQueries();
      toast({ title: "Úspěch", description: "Host byl aktualizován" });
      setDialogOpen(false);
      setEditingGuest(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Chyba", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await api.delete(`/api/events/${eventId}/guests/${id}`);
    },
    onSuccess: () => {
      invalidateQueries();
      toast({ title: "Úspěch", description: "Host byl smazán" });
    },
    onError: (error: Error) => {
      toast({ title: "Chyba", description: error.message, variant: "destructive" });
    },
  });

  const loadFromReservationsMutation = useMutation({
    mutationFn: async () => {
      return await api.post(`/api/events/${eventId}/guests/from-reservations`);
    },
    onSuccess: (data: any) => {
      invalidateQueries();
      toast({ title: "Úspěch", description: `Načteno ${data.guestsCount} hostů z rezervací` });
    },
    onError: (error: Error) => {
      toast({ title: "Chyba", description: error.message, variant: "destructive" });
    },
  });

  const bulkCreateMutation = useMutation({
    mutationFn: async (data: { count: number; type: string; nationality?: string; isPaid: boolean }) => {
      return await api.post(`/api/events/${eventId}/guests/bulk`, data);
    },
    onSuccess: (data: any) => {
      invalidateQueries();
      toast({ title: "Úspěch", description: `Přidáno ${data.count} hostů` });
      setBulkCount(1);
    },
    onError: (error: Error) => {
      toast({ title: "Chyba", description: error.message, variant: "destructive" });
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async (data: { guestIds: number[]; updates: Record<string, any> }) => {
      return await api.put(`/api/events/${eventId}/guests/bulk-update`, data);
    },
    onSuccess: (data: any) => {
      invalidateQueries();
      setSelectedIds(new Set());
      setBulkActionDialogOpen(false);
      toast({ title: "Úspěch", description: `Aktualizováno ${data.count} hostů` });
    },
    onError: (error: Error) => {
      toast({ title: "Chyba", description: error.message, variant: "destructive" });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (guestIds: number[]) => {
      return await api.delete(`/api/events/${eventId}/guests/bulk-delete`, { data: { guestIds } });
    },
    onSuccess: (data: any) => {
      invalidateQueries();
      setSelectedIds(new Set());
      setBulkActionDialogOpen(false);
      toast({ title: "Úspěch", description: `Smazáno ${data.count} hostů` });
    },
    onError: (error: Error) => {
      toast({ title: "Chyba", description: error.message, variant: "destructive" });
    },
  });

  const handleEdit = (guest: EventGuest) => {
    setEditingGuest(guest);
    form.reset({
      firstName: guest.firstName || "",
      lastName: guest.lastName || "",
      nationality: guest.nationality || "",
      type: guest.type as any,
      isPaid: guest.isPaid,
      isPresent: guest.isPresent,
      notes: guest.notes || "",
    });
    setDialogOpen(true);
  };

  const onSubmit = (data: GuestForm) => {
    if (editingGuest) {
      updateMutation.mutate({ ...data, id: editingGuest.id });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleBulkAdd = () => {
    if (bulkCount < 1) {
      toast({ title: "Zadejte platný počet", variant: "destructive" });
      return;
    }
    bulkCreateMutation.mutate({
      count: bulkCount,
      type: bulkType,
      nationality: bulkNationality || undefined,
      isPaid: bulkIsPaid,
    });
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === guests.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(guests.map(g => g.id)));
    }
  };

  const openBulkAction = (action: typeof bulkActionType) => {
    setBulkActionType(action);
    setBulkActionValue("");
    setBulkActionDialogOpen(true);
  };

  const executeBulkAction = () => {
    const guestIds = Array.from(selectedIds);

    if (bulkActionType === "delete") {
      bulkDeleteMutation.mutate(guestIds);
      return;
    }

    const updates: Record<string, any> = {};
    switch (bulkActionType) {
      case "nationality":
        updates.nationality = bulkActionValue;
        break;
      case "type":
        updates.type = bulkActionValue;
        break;
      case "isPaid":
        updates.isPaid = bulkActionValue === "true";
        break;
      case "isPresent":
        updates.isPresent = bulkActionValue === "true";
        break;
    }

    bulkUpdateMutation.mutate({ guestIds, updates });
  };

  // Count statistics
  const stats = {
    total: guests.length,
    adults: guests.filter(g => g.type === "adult").length,
    children: guests.filter(g => g.type === "child").length,
    infants: guests.filter(g => g.type === "infant").length,
    paid: guests.filter(g => g.isPaid).length,
    free: guests.filter(g => !g.isPaid).length,
    present: guests.filter(g => g.isPresent).length,
  };

  return (
    <div className="space-y-4">
      {/* Header with stats */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-lg">Seznam hostů</CardTitle>
          <Badge variant="secondary">{stats.total} celkem</Badge>
          {stats.adults > 0 && <Badge variant="outline">{stats.adults} dospělých</Badge>}
          {stats.children > 0 && <Badge variant="outline">{stats.children} dětí</Badge>}
          {stats.infants > 0 && <Badge variant="outline">{stats.infants} batolat</Badge>}
        </div>
        <div className="flex gap-2">
          {isFolklorniShow && (
            <Button
              variant="outline"
              onClick={() => loadFromReservationsMutation.mutate()}
              disabled={loadFromReservationsMutation.isPending}
              data-testid="button-load-guests-from-reservations"
            >
              {loadFromReservationsMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Obnovit z rezervací
            </Button>
          )}
          <Button onClick={() => { setEditingGuest(null); form.reset(); setDialogOpen(true); }} data-testid="button-add-guest">
            <Plus className="mr-2 h-4 w-4" />
            Přidat hosta
          </Button>
        </div>
      </div>

      {/* Bulk add section - only for non-folklorni_show */}
      {!isFolklorniShow && (
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
                  data-testid="input-bulk-count"
                />
              </div>
              <div>
                <Label className="text-xs">Typ</Label>
                <Select value={bulkType} onValueChange={setBulkType}>
                  <SelectTrigger className="mt-1" data-testid="select-bulk-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(GUEST_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Národnost</Label>
                <Input
                  value={bulkNationality}
                  onChange={(e) => setBulkNationality(e.target.value)}
                  placeholder="např. Česká republika"
                  className="mt-1"
                  data-testid="input-bulk-nationality"
                />
              </div>
              <div className="flex items-center gap-2 pt-5">
                <Checkbox
                  checked={bulkIsPaid}
                  onCheckedChange={(checked) => setBulkIsPaid(Boolean(checked))}
                  data-testid="checkbox-bulk-is-paid"
                />
                <Label className="text-xs">Platící</Label>
              </div>
              <div className="md:col-span-2">
                <Button
                  onClick={handleBulkAdd}
                  disabled={bulkCreateMutation.isPending}
                  className="w-full"
                  data-testid="button-bulk-add"
                >
                  {bulkCreateMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  Přidat {bulkCount} {bulkCount === 1 ? "hosta" : "hostů"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selection actions bar */}
      {selectedIds.size > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="mr-2">
                <CheckSquare className="mr-1 h-3 w-3" />
                {selectedIds.size} vybráno
              </Badge>
              <Button size="sm" variant="outline" onClick={() => openBulkAction("nationality")}>
                Změnit národnost
              </Button>
              <Button size="sm" variant="outline" onClick={() => openBulkAction("type")}>
                Změnit typ
              </Button>
              <Button size="sm" variant="outline" onClick={() => openBulkAction("isPaid")}>
                Změnit placení
              </Button>
              <Button size="sm" variant="outline" onClick={() => openBulkAction("isPresent")}>
                Změnit přítomnost
              </Button>
              <Button size="sm" variant="destructive" onClick={() => openBulkAction("delete")}>
                <Trash2 className="mr-1 h-3 w-3" />
                Smazat vybrané
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
                Zrušit výběr
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Guest table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={guests.length > 0 && selectedIds.size === guests.length}
                    onCheckedChange={toggleSelectAll}
                    data-testid="checkbox-select-all"
                  />
                </TableHead>
                <TableHead>Jméno</TableHead>
                <TableHead>Příjmení</TableHead>
                <TableHead>Typ</TableHead>
                <TableHead>Národnost</TableHead>
                <TableHead>Platící</TableHead>
                <TableHead>Přítomen</TableHead>
                <TableHead>Poznámka</TableHead>
                <TableHead className="w-[100px]">Akce</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9}>
                    <div className="flex items-center gap-2 text-muted-foreground py-4">
                      <Loader2 className="h-4 w-4 animate-spin" /> Načítání...
                    </div>
                  </TableCell>
                </TableRow>
              ) : guests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-muted-foreground py-8 text-center">
                    {isFolklorniShow
                      ? "Zatím žádní hosté. Klikněte na 'Obnovit z rezervací' pro načtení."
                      : "Zatím žádní hosté. Použijte hromadné přidání nebo tlačítko 'Přidat hosta'."}
                  </TableCell>
                </TableRow>
              ) : (
                guests.map((g) => (
                  <TableRow key={g.id} className={selectedIds.has(g.id) ? "bg-primary/5" : ""}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(g.id)}
                        onCheckedChange={() => toggleSelect(g.id)}
                        data-testid={`checkbox-guest-${g.id}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{g.firstName || "-"}</TableCell>
                    <TableCell>{g.lastName || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {GUEST_TYPE_LABELS[g.type] || g.type}
                      </Badge>
                    </TableCell>
                    <TableCell>{g.nationality || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={g.isPaid ? "default" : "secondary"}>
                        {g.isPaid ? "Ano" : "Ne"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={g.isPresent ? "default" : "outline"}>
                        {g.isPresent ? "Ano" : "Ne"}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate" title={g.notes || ""}>
                      {g.notes || "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(g)}
                          data-testid={`button-edit-guest-${g.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate(g.id)}
                          data-testid={`button-delete-guest-${g.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Single guest dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingGuest ? "Upravit hosta" : "Přidat hosta"}</DialogTitle>
            <DialogDescription>Vyplňte údaje o hostovi</DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jméno *</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-first-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Příjmení</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-last-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Typ *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-type">
                            <SelectValue placeholder="Vyberte typ" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(GUEST_TYPE_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="nationality"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Národnost</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-nationality" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isPaid"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                          data-testid="checkbox-is-paid"
                        />
                      </FormControl>
                      <FormLabel className="font-normal">Platící host</FormLabel>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isPresent"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                          data-testid="checkbox-is-present"
                        />
                      </FormControl>
                      <FormLabel className="font-normal">Přítomen</FormLabel>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Poznámky</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} data-testid="button-cancel-guest">
                  Zrušit
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-submit-guest">
                  {(createMutation.isPending || updateMutation.isPending) ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Ukládám...
                    </>
                  ) : editingGuest ? (
                    "Uložit"
                  ) : (
                    "Přidat"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Bulk action dialog */}
      <Dialog open={bulkActionDialogOpen} onOpenChange={setBulkActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {bulkActionType === "delete"
                ? `Smazat ${selectedIds.size} hostů?`
                : `Hromadná změna (${selectedIds.size} hostů)`}
            </DialogTitle>
            <DialogDescription>
              {bulkActionType === "delete"
                ? "Tato akce je nevratná."
                : "Vyberte novou hodnotu pro všechny označené hosty."}
            </DialogDescription>
          </DialogHeader>

          {bulkActionType !== "delete" && (
            <div className="py-4">
              {bulkActionType === "nationality" && (
                <div>
                  <Label>Národnost</Label>
                  <Input
                    value={bulkActionValue}
                    onChange={(e) => setBulkActionValue(e.target.value)}
                    placeholder="např. Česká republika"
                    className="mt-1"
                    data-testid="input-bulk-action-nationality"
                  />
                </div>
              )}
              {bulkActionType === "type" && (
                <div>
                  <Label>Typ hosta</Label>
                  <Select value={bulkActionValue} onValueChange={setBulkActionValue}>
                    <SelectTrigger className="mt-1" data-testid="select-bulk-action-type">
                      <SelectValue placeholder="Vyberte typ" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(GUEST_TYPE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {bulkActionType === "isPaid" && (
                <div>
                  <Label>Platící</Label>
                  <Select value={bulkActionValue} onValueChange={setBulkActionValue}>
                    <SelectTrigger className="mt-1" data-testid="select-bulk-action-is-paid">
                      <SelectValue placeholder="Vyberte hodnotu" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Ano - platící</SelectItem>
                      <SelectItem value="false">Ne - neplatící</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              {bulkActionType === "isPresent" && (
                <div>
                  <Label>Přítomnost</Label>
                  <Select value={bulkActionValue} onValueChange={setBulkActionValue}>
                    <SelectTrigger className="mt-1" data-testid="select-bulk-action-is-present">
                      <SelectValue placeholder="Vyberte hodnotu" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Ano - přítomen</SelectItem>
                      <SelectItem value="false">Ne - nepřítomen</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkActionDialogOpen(false)}>
              Zrušit
            </Button>
            <Button
              variant={bulkActionType === "delete" ? "destructive" : "default"}
              onClick={executeBulkAction}
              disabled={
                bulkUpdateMutation.isPending ||
                bulkDeleteMutation.isPending ||
                (bulkActionType !== "delete" && !bulkActionValue)
              }
              data-testid="button-execute-bulk-action"
            >
              {(bulkUpdateMutation.isPending || bulkDeleteMutation.isPending) ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {bulkActionType === "delete" ? "Smazat" : "Aplikovat"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
