import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { api } from "@/lib/api";
import type { Partner } from "@shared/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, Search, Users2, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

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
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [viewingPartner, setViewingPartner] = useState<Partner | null>(null);
  const { toast } = useToast();

  const { data: partners, isLoading } = useQuery<Partner[]>({
    queryKey: ["/api/partners"],
  });

  const createForm = useForm<PartnerForm>({
    resolver: zodResolver(partnerSchema),
    defaultValues: {
      name: "",
      contactEmail: "",
      contactPhone: "",
      commissionPercent: 10,
      active: true,
    },
  });

  const editForm = useForm<PartnerForm>({
    resolver: zodResolver(partnerSchema),
  });

  const createMutation = useMutation({
    mutationFn: async (data: PartnerForm) => {
      return await api.post("/api/partners", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/partners"] });
      setIsCreateOpen(false);
      createForm.reset();
      toast({
        title: "Úspěch",
        description: "Partner byl vytvořen",
      });
    },
    onError: () => {
      toast({
        title: "Chyba",
        description: "Nepodařilo se vytvořit partnera",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: PartnerForm }) => {
      return await api.put(`/api/partners/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/partners"] });
      setIsEditOpen(false);
      setEditingPartner(null);
      toast({
        title: "Úspěch",
        description: "Partner byl aktualizován",
      });
    },
    onError: () => {
      toast({
        title: "Chyba",
        description: "Nepodařilo se aktualizovat partnera",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await api.delete(`/api/partners/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/partners"] });
      toast({
        title: "Úspěch",
        description: "Partner byl smazán",
      });
    },
    onError: () => {
      toast({
        title: "Chyba",
        description: "Nepodařilo se smazat partnera",
        variant: "destructive",
      });
    },
  });

  const filteredPartners = partners?.filter((partner) =>
    partner.name.toLowerCase().includes(search.toLowerCase()) ||
    partner.contactEmail.toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (partner: Partner) => {
    setEditingPartner(partner);
    editForm.reset({
      name: partner.name,
      contactEmail: partner.contactEmail,
      contactPhone: partner.contactPhone || "",
      commissionPercent: partner.commissionPercent,
      active: partner.active,
    });
    setIsEditOpen(true);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Partneři</h1>
          <p className="text-muted-foreground">Správa affiliate partnerů a provizí</p>
        </div>
        <Button
          onClick={() => setIsCreateOpen(true)}
          className="bg-gradient-to-r from-primary to-purple-600"
          data-testid="button-create-partner"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nový partner
        </Button>
      </div>

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
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleView(partner)}
                          data-testid={`button-view-${partner.id}`}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(partner)}
                          data-testid={`button-edit-${partner.id}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(partner.id)}
                          data-testid={`button-delete-${partner.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
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

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nový partner</DialogTitle>
            <DialogDescription>Vytvořte nového affiliate partnera</DialogDescription>
          </DialogHeader>
          <Form {...createForm}>
            <form
              onSubmit={createForm.handleSubmit((data) => createMutation.mutate(data))}
              className="space-y-4"
            >
              <FormField
                control={createForm.control}
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
                control={createForm.control}
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
                control={createForm.control}
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
                control={createForm.control}
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
                control={createForm.control}
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
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Zrušit
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="bg-gradient-to-r from-primary to-purple-600"
                >
                  {createMutation.isPending ? "Vytváření..." : "Vytvořit"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upravit partnera</DialogTitle>
            <DialogDescription>Upravte údaje partnera</DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form
              onSubmit={editForm.handleSubmit((data) =>
                editingPartner && updateMutation.mutate({ id: editingPartner.id, data })
              )}
              className="space-y-4"
            >
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Jméno *</FormLabel>
                    <FormControl>
                      <Input placeholder="Jméno partnera" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
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
                control={editForm.control}
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
                control={editForm.control}
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
                control={editForm.control}
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
                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                  Zrušit
                </Button>
                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="bg-gradient-to-r from-primary to-purple-600"
                >
                  {updateMutation.isPending ? "Ukládání..." : "Uložit"}
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
