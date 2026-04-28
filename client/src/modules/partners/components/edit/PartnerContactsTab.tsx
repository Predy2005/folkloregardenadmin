import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { successToast, errorToast } from "@/shared/lib/toast-helpers";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Card, CardContent } from "@/shared/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { Plus, Pencil, Trash2, Phone, Mail, Loader2, Users } from "lucide-react";

export interface PartnerContact {
  id: number;
  partnerId: number;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface FormState {
  id: number | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  notes: string;
  displayOrder: number;
}

const emptyForm: FormState = {
  id: null,
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  notes: "",
  displayOrder: 0,
};

interface Props {
  partnerId: number;
}

export function PartnerContactsTab({ partnerId }: Props) {
  const qc = useQueryClient();
  const queryKey = ["/api/partners", partnerId, "contacts"] as const;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: contacts, isLoading } = useQuery({
    queryKey,
    queryFn: () => api.get<PartnerContact[]>(`/api/partners/${partnerId}/contacts`),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey });

  const createMutation = useMutation({
    mutationFn: (data: Omit<FormState, "id">) =>
      api.post<PartnerContact>(`/api/partners/${partnerId}/contacts`, data),
    onSuccess: () => {
      invalidate();
      successToast("Kontakt přidán");
      setDialogOpen(false);
    },
    onError: (e: Error) => errorToast(e),
  });

  const updateMutation = useMutation({
    mutationFn: (data: FormState) =>
      api.put<PartnerContact>(`/api/partner-contacts/${data.id}`, {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        notes: data.notes,
        displayOrder: data.displayOrder,
      }),
    onSuccess: () => {
      invalidate();
      successToast("Kontakt aktualizován");
      setDialogOpen(false);
    },
    onError: (e: Error) => errorToast(e),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/partner-contacts/${id}`),
    onSuccess: () => {
      invalidate();
      successToast("Kontakt smazán");
      setDeleteId(null);
    },
    onError: (e: Error) => errorToast(e),
  });

  // Reset formuláře při otevření/zavření
  useEffect(() => {
    if (!dialogOpen) setForm(emptyForm);
  }, [dialogOpen]);

  const openCreate = () => {
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (c: PartnerContact) => {
    setForm({
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName ?? "",
      email: c.email ?? "",
      phone: c.phone ?? "",
      notes: c.notes ?? "",
      displayOrder: c.displayOrder,
    });
    setDialogOpen(true);
  };

  const submit = () => {
    if (form.firstName.trim() === "") {
      errorToast("Jméno je povinné");
      return;
    }
    if (form.id === null) {
      const { id: _ignored, ...payload } = form;
      void _ignored;
      createMutation.mutate(payload);
    } else {
      updateMutation.mutate(form);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-muted-foreground" />
            <h3 className="font-medium">Kontaktní osoby</h3>
            <span className="text-sm text-muted-foreground">
              ({contacts?.length ?? 0})
            </span>
          </div>
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Přidat kontakt
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">
          Lidé z partnerovy strany (zaměstnanci, asistenti, průvodci…), kteří mohou objednávat za partnera.
        </p>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : !contacts?.length ? (
          <div className="text-center py-8 text-muted-foreground border rounded-md">
            Zatím žádné kontaktní osoby. Přidej prvního pomocí tlačítka nahoře.
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Jméno</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefon</TableHead>
                  <TableHead>Poznámka</TableHead>
                  <TableHead className="text-right">Akce</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.map((c) => (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => openEdit(c)}
                  >
                    <TableCell className="font-medium">
                      {c.firstName}
                      {c.lastName ? ` ${c.lastName}` : ""}
                    </TableCell>
                    <TableCell>
                      {c.email ? (
                        <a
                          href={`mailto:${c.email}`}
                          className="text-primary hover:underline flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Mail className="w-3 h-3" />
                          {c.email}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {c.phone ? (
                        <a
                          href={`tel:${c.phone}`}
                          className="text-primary hover:underline flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Phone className="w-3 h-3" />
                          {c.phone}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate text-sm text-muted-foreground">
                      {c.notes || ""}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => setDeleteId(c.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{form.id === null ? "Nový kontakt" : "Upravit kontakt"}</DialogTitle>
              <DialogDescription>Kontaktní osoba u partnera (zaměstnanec, asistent, průvodce…).</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="contact-first">Jméno *</Label>
                  <Input
                    id="contact-first"
                    value={form.firstName}
                    onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                    autoFocus
                  />
                </div>
                <div>
                  <Label htmlFor="contact-last">Příjmení</Label>
                  <Input
                    id="contact-last"
                    value={form.lastName}
                    onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="contact-email">Email</Label>
                <Input
                  id="contact-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="(volitelné)"
                />
              </div>
              <div>
                <Label htmlFor="contact-phone">Telefon</Label>
                <Input
                  id="contact-phone"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="(volitelné)"
                />
              </div>
              <div>
                <Label htmlFor="contact-notes">Poznámka</Label>
                <Textarea
                  id="contact-notes"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  placeholder="Role, jazyk, preferované hodiny, ..."
                />
              </div>
              <div>
                <Label htmlFor="contact-order">Pořadí v seznamu</Label>
                <Input
                  id="contact-order"
                  type="number"
                  min={0}
                  value={form.displayOrder}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, displayOrder: Math.max(0, Number.parseInt(e.target.value) || 0) }))
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Zrušit</Button>
              <Button onClick={submit} disabled={isPending}>
                {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Uložit
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Smazat kontakt?</AlertDialogTitle>
              <AlertDialogDescription>Akce je nevratná.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Zrušit</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteId !== null && deleteMutation.mutate(deleteId)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Smazat
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
