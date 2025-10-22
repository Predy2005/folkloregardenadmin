import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { api } from "@/lib/api";
import type { Voucher, Partner } from "@shared/types";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, Search, Ticket, QrCode } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import dayjs from "dayjs";

const voucherSchema = z.object({
  code: z.string().min(3, "Kód musí mít alespoň 3 znaky"),
  discountPercent: z.number().min(0).max(100, "Sleva musí být 0-100%"),
  validFrom: z.string().min(1, "Zadejte datum začátku platnosti"),
  validTo: z.string().min(1, "Zadejte datum konce platnosti"),
  usageLimit: z.number().optional(),
  partnerId: z.number().optional(),
  active: z.boolean().default(true),
});

type VoucherForm = z.infer<typeof voucherSchema>;

export default function Vouchers() {
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null);
  const { toast } = useToast();

  const { data: vouchers, isLoading } = useQuery<Voucher[]>({
    queryKey: ["/api/vouchers"],
  });

  const { data: partners } = useQuery<Partner[]>({
    queryKey: ["/api/partners"],
  });

  const createForm = useForm<VoucherForm>({
    resolver: zodResolver(voucherSchema),
    defaultValues: {
      code: "",
      discountPercent: 10,
      validFrom: dayjs().format("YYYY-MM-DD"),
      validTo: dayjs().add(1, "month").format("YYYY-MM-DD"),
      active: true,
    },
  });

  const editForm = useForm<VoucherForm>({
    resolver: zodResolver(voucherSchema),
  });

  const createMutation = useMutation({
    mutationFn: async (data: VoucherForm) => {
      return await api.post("/api/vouchers", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vouchers"] });
      setIsCreateOpen(false);
      createForm.reset();
      toast({
        title: "Úspěch",
        description: "Voucher byl vytvořen",
      });
    },
    onError: () => {
      toast({
        title: "Chyba",
        description: "Nepodařilo se vytvořit voucher",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: VoucherForm }) => {
      return await api.put(`/api/vouchers/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vouchers"] });
      setIsEditOpen(false);
      setEditingVoucher(null);
      toast({
        title: "Úspěch",
        description: "Voucher byl aktualizován",
      });
    },
    onError: () => {
      toast({
        title: "Chyba",
        description: "Nepodařilo se aktualizovat voucher",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await api.delete(`/api/vouchers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vouchers"] });
      toast({
        title: "Úspěch",
        description: "Voucher byl smazán",
      });
    },
    onError: () => {
      toast({
        title: "Chyba",
        description: "Nepodařilo se smazat voucher",
        variant: "destructive",
      });
    },
  });

  const filteredVouchers = vouchers?.filter((voucher) =>
    voucher.code.toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (voucher: Voucher) => {
    setEditingVoucher(voucher);
    editForm.reset({
      code: voucher.code,
      discountPercent: voucher.discountPercent,
      validFrom: dayjs(voucher.validFrom).format("YYYY-MM-DD"),
      validTo: dayjs(voucher.validTo).format("YYYY-MM-DD"),
      usageLimit: voucher.usageLimit,
      partnerId: voucher.partnerId,
      active: voucher.active,
    });
    setIsEditOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Opravdu chcete smazat tento voucher?")) {
      deleteMutation.mutate(id);
    }
  };

  const getVoucherStatus = (voucher: Voucher) => {
    if (!voucher.active) return { label: "Neaktivní", variant: "secondary" as const };
    const now = dayjs();
    const validTo = dayjs(voucher.validTo);
    if (validTo.isBefore(now)) return { label: "Vypršel", variant: "destructive" as const };
    return { label: "Aktivní", variant: "default" as const };
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Vouchery</h1>
          <p className="text-muted-foreground">Správa slevových kódů a QR voucherů</p>
        </div>
        <Button
          onClick={() => setIsCreateOpen(true)}
          className="bg-gradient-to-r from-primary to-purple-600"
          data-testid="button-create-voucher"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nový voucher
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Ticket className="w-5 h-5" />
                Vouchery
              </CardTitle>
              <CardDescription>
                Celkem: {vouchers?.length || 0} voucherů
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Hledat voucher..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 w-64"
                  data-testid="input-search-vouchers"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Načítání...</div>
          ) : filteredVouchers && filteredVouchers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kód</TableHead>
                  <TableHead>Sleva</TableHead>
                  <TableHead>Platnost</TableHead>
                  <TableHead>Využití</TableHead>
                  <TableHead>Partner</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Akce</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVouchers.map((voucher) => {
                  const status = getVoucherStatus(voucher);
                  return (
                    <TableRow key={voucher.id} data-testid={`row-voucher-${voucher.id}`}>
                      <TableCell className="font-mono font-medium">{voucher.code}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{voucher.discountPercent}%</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{dayjs(voucher.validFrom).format("DD.MM.YYYY")}</div>
                          <div className="text-muted-foreground">
                            do {dayjs(voucher.validTo).format("DD.MM.YYYY")}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {voucher.usedCount}
                          {voucher.usageLimit && ` / ${voucher.usageLimit}`}
                        </span>
                      </TableCell>
                      <TableCell>
                        {voucher.partner?.name || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {voucher.qrCodeUrl && (
                            <Button
                              variant="ghost"
                              size="icon"
                              data-testid={`button-qr-${voucher.id}`}
                            >
                              <QrCode className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(voucher)}
                            data-testid={`button-edit-${voucher.id}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(voucher.id)}
                            data-testid={`button-delete-${voucher.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {search ? "Žádné vouchery nenalezeny" : "Zatím žádné vouchery"}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Form Dialog */}
      <Dialog open={isCreateOpen || isEditOpen} onOpenChange={(open) => {
        if (!open) {
          setIsCreateOpen(false);
          setIsEditOpen(false);
          setEditingVoucher(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditOpen ? "Upravit voucher" : "Nový voucher"}</DialogTitle>
            <DialogDescription>
              {isEditOpen ? "Upravte údaje voucheru" : "Vytvořte nový slevový voucher"}
            </DialogDescription>
          </DialogHeader>
          <Form {...(isEditOpen ? editForm : createForm)}>
            <form
              onSubmit={(isEditOpen ? editForm : createForm).handleSubmit((data) =>
                isEditOpen && editingVoucher
                  ? updateMutation.mutate({ id: editingVoucher.id, data })
                  : createMutation.mutate(data)
              )}
              className="space-y-4"
            >
              <FormField
                control={(isEditOpen ? editForm : createForm).control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kód *</FormLabel>
                    <FormControl>
                      <Input placeholder="SUMMER2025" data-testid="input-code" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={(isEditOpen ? editForm : createForm).control}
                name="discountPercent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sleva (%) *</FormLabel>
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
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={(isEditOpen ? editForm : createForm).control}
                  name="validFrom"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Platnost od *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={(isEditOpen ? editForm : createForm).control}
                  name="validTo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Platnost do *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={(isEditOpen ? editForm : createForm).control}
                name="usageLimit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Limit použití</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        placeholder="Neomezeno"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={(isEditOpen ? editForm : createForm).control}
                name="partnerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Partner</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value === "0" ? undefined : parseInt(value))}
                      value={field.value?.toString() || "0"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Vyberte partnera (volitelné)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="0">Bez partnera</SelectItem>
                        {partners?.map((partner) => (
                          <SelectItem key={partner.id} value={partner.id.toString()}>
                            {partner.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={(isEditOpen ? editForm : createForm).control}
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
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateOpen(false);
                    setIsEditOpen(false);
                    setEditingVoucher(null);
                  }}
                >
                  Zrušit
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="bg-gradient-to-r from-primary to-purple-600"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? "Ukládání..."
                    : isEditOpen
                    ? "Uložit"
                    : "Vytvořit"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
