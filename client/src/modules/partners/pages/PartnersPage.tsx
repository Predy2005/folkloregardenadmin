import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Partner } from "@shared/types";
import { useFormDialog } from "@/shared/hooks/useFormDialog";
import { useCrudMutations } from "@/shared/hooks/useCrudMutations";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/components/ui/tooltip";
import { Plus, Pencil, Trash2, Search, Users2, Eye } from "lucide-react";
import { PageHeader } from "@/shared/components/PageHeader";
import { Badge } from "@/shared/components/ui/badge";
import { Switch } from "@/shared/components/ui/switch";

const partnerSchema = z.object({
  name: z.string().min(1, "Zadejte jméno partnera"),
  contactEmail: z.string().email("Zadejte platný email"),
  contactPhone: z.string().optional(),
  commissionPercent: z.number().min(0).max(100, "Provize musí být 0-100%"),
  active: z.boolean().default(true),
});

type PartnerForm = z.infer<typeof partnerSchema>;

export default function Partners() {
  const [search, setSearch] = useState("");
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewingPartner, setViewingPartner] = useState<Partner | null>(null);
  const dialog = useFormDialog<Partner>();

  const { data: partners, isLoading } = useQuery<Partner[]>({
    queryKey: ["/api/partners"],
  });

  const form = useForm<PartnerForm>({
    resolver: zodResolver(partnerSchema),
    defaultValues: {
      name: "",
      contactEmail: "",
      contactPhone: "",
      commissionPercent: 10,
      active: true,
    },
  });

  const { createMutation, updateMutation, deleteMutation, isPending } = useCrudMutations<PartnerForm>({
    endpoint: "/api/partners",
    queryKey: ["/api/partners"],
    entityName: "Partner",
    onCreateSuccess: () => { dialog.close(); form.reset(); },
    onUpdateSuccess: () => dialog.close(),
  });

  const filteredPartners = partners?.filter((partner) =>
    partner.name.toLowerCase().includes(search.toLowerCase()) ||
    partner.contactEmail.toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (partner: Partner) => {
    dialog.openEdit(partner);
    form.reset({
      name: partner.name,
      contactEmail: partner.contactEmail,
      contactPhone: partner.contactPhone || "",
      commissionPercent: partner.commissionPercent,
      active: partner.active,
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Opravdu chcete smazat tohoto partnera?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleView = (partner: Partner) => {
    setViewingPartner(partner);
    setIsViewOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Partneři" description="Správa affiliate partnerů a provizí">
        <Button
          onClick={() => { dialog.openCreate(); form.reset(); }}
          className="bg-gradient-to-r from-primary to-purple-600"
          data-testid="button-create-partner"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nový partner
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users2 className="w-5 h-5" />
                Partneři
              </CardTitle>
              <CardDescription>
                Celkem: {partners?.length || 0} partnerů
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Hledat partnera..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 w-64"
                  data-testid="input-search-partners"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Načítání...</div>
          ) : filteredPartners && filteredPartners.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Jméno</TableHead>
                  <TableHead>Kontakt</TableHead>
                  <TableHead>Provize</TableHead>
                  <TableHead>Příjmy celkem</TableHead>
                  <TableHead>Provize celkem</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Akce</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPartners.map((partner) => (
                  <TableRow key={partner.id} data-testid={`row-partner-${partner.id}`}>
                    <TableCell className="font-medium">{partner.name}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{partner.contactEmail}</div>
                        {partner.contactPhone && (
                          <div className="text-muted-foreground">{partner.contactPhone}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{partner.commissionPercent}%</Badge>
                    </TableCell>
                    <TableCell>{partner.totalRevenue.toLocaleString()} Kč</TableCell>
                    <TableCell className="font-medium text-primary">
                      {partner.totalCommission.toLocaleString()} Kč
                    </TableCell>
                    <TableCell>
                      <Badge variant={partner.active ? "default" : "secondary"}>
                        {partner.active ? "Aktivní" : "Neaktivní"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <TooltipProvider>
                      <div className="flex items-center justify-end gap-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleView(partner)}
                              data-testid={`button-view-${partner.id}`}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Zobrazit detail</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(partner)}
                              data-testid={`button-edit-${partner.id}`}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Upravit</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(partner.id)}
                              data-testid={`button-delete-${partner.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Smazat</TooltipContent>
                        </Tooltip>
                      </div>
                      </TooltipProvider>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {search ? "Žádní partneři nenalezeni" : "Zatím žádní partneři"}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialog.isOpen} onOpenChange={(open) => { if (!open) dialog.close(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialog.isEditing ? "Upravit partnera" : "Nový partner"}</DialogTitle>
            <DialogDescription>{dialog.isEditing ? "Upravte údaje partnera" : "Vytvořte nového affiliate partnera"}</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((data) =>
                dialog.isEditing && dialog.editingItem
                  ? updateMutation.mutate({ id: dialog.editingItem.id, data })
                  : createMutation.mutate(data)
              )}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Jméno *</FormLabel>
                    <FormControl>
                      <Input placeholder="Jméno partnera" data-testid="input-name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contactEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email *</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="email@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contactPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefon</FormLabel>
                    <FormControl>
                      <Input placeholder="+420..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="commissionPercent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Provize (%) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="active"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <FormLabel>Aktivní</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => dialog.close()}>
                  Zrušit
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="bg-gradient-to-r from-primary to-purple-600"
                >
                  {isPending ? "Ukládání..." : dialog.isEditing ? "Uložit" : "Vytvořit"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detail partnera</DialogTitle>
            <DialogDescription>Informace o partnerovi a provizích</DialogDescription>
          </DialogHeader>
          {viewingPartner && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-1">Jméno</h3>
                  <p className="text-muted-foreground">{viewingPartner.name}</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Status</h3>
                  <Badge variant={viewingPartner.active ? "default" : "secondary"}>
                    {viewingPartner.active ? "Aktivní" : "Neaktivní"}
                  </Badge>
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Email</h3>
                  <p className="text-muted-foreground">{viewingPartner.contactEmail}</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Telefon</h3>
                  <p className="text-muted-foreground">{viewingPartner.contactPhone || "-"}</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Provize</h3>
                  <Badge variant="secondary">{viewingPartner.commissionPercent}%</Badge>
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Celkové příjmy</h3>
                  <p className="text-muted-foreground">{viewingPartner.totalRevenue.toLocaleString()} Kč</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Provize celkem</h3>
                  <p className="font-medium text-primary">{viewingPartner.totalCommission.toLocaleString()} Kč</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Vouchery</h3>
                  <p className="text-muted-foreground">{viewingPartner.vouchers?.length || 0} ks</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsViewOpen(false)}>Zavřít</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
