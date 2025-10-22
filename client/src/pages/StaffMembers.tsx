import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { api } from "@/lib/api";
import type { StaffMember } from "@shared/types";
import { STAFF_ROLE_LABELS } from "@shared/types";
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
import { Plus, Pencil, Trash2, Search, UserCog } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

const staffSchema = z.object({
  firstName: z.string().min(1, "Zadejte jméno"),
  lastName: z.string().min(1, "Zadejte příjmení"),
  email: z.string().email("Zadejte platný email"),
  phone: z.string().optional(),
  role: z.string().min(1, "Vyberte roli"),
  hourlyRate: z.number().optional(),
  active: z.boolean().default(true),
});

type StaffForm = z.infer<typeof staffSchema>;

export default function StaffMembers() {
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const { toast } = useToast();

  const { data: staff, isLoading } = useQuery<StaffMember[]>({
    queryKey: ["/api/staff"],
  });

  const createForm = useForm<StaffForm>({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      role: "waiter",
      active: true,
    },
  });

  const editForm = useForm<StaffForm>({
    resolver: zodResolver(staffSchema),
  });

  const createMutation = useMutation({
    mutationFn: async (data: StaffForm) => {
      return await api.post("/api/staff", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      setIsCreateOpen(false);
      createForm.reset();
      toast({
        title: "Úspěch",
        description: "Člen personálu byl vytvořen",
      });
    },
    onError: () => {
      toast({
        title: "Chyba",
        description: "Nepodařilo se vytvořit člena personálu",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: StaffForm }) => {
      return await api.put(`/api/staff/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      setIsEditOpen(false);
      setEditingStaff(null);
      toast({
        title: "Úspěch",
        description: "Člen personálu byl aktualizován",
      });
    },
    onError: () => {
      toast({
        title: "Chyba",
        description: "Nepodařilo se aktualizovat člena personálu",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await api.delete(`/api/staff/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      toast({
        title: "Úspěch",
        description: "Člen personálu byl smazán",
      });
    },
    onError: () => {
      toast({
        title: "Chyba",
        description: "Nepodařilo se smazat člena personálu",
        variant: "destructive",
      });
    },
  });

  const filteredStaff = staff?.filter((member) =>
    `${member.firstName} ${member.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
    member.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (member: StaffMember) => {
    setEditingStaff(member);
    editForm.reset({
      firstName: member.firstName,
      lastName: member.lastName,
      email: member.email,
      phone: member.phone || "",
      role: member.role,
      hourlyRate: member.hourlyRate,
      active: member.active,
    });
    setIsEditOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Opravdu chcete smazat tohoto člena personálu?")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Personál</h1>
          <p className="text-muted-foreground">Správa členů týmu</p>
        </div>
        <Button
          onClick={() => setIsCreateOpen(true)}
          className="bg-gradient-to-r from-primary to-purple-600"
          data-testid="button-create-staff"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nový člen
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <UserCog className="w-5 h-5" />
                Členové týmu
              </CardTitle>
              <CardDescription>
                Celkem: {staff?.length || 0} členů
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Hledat člena..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 w-64"
                  data-testid="input-search-staff"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Načítání...</div>
          ) : filteredStaff && filteredStaff.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Jméno</TableHead>
                  <TableHead>Kontakt</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Hodinová sazba</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Akce</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStaff.map((member) => (
                  <TableRow key={member.id} data-testid={`row-staff-${member.id}`}>
                    <TableCell className="font-medium">
                      {member.firstName} {member.lastName}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{member.email}</div>
                        {member.phone && (
                          <div className="text-muted-foreground">{member.phone}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {STAFF_ROLE_LABELS[member.role] || member.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {member.hourlyRate ? `${member.hourlyRate} Kč/h` : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={member.active ? "default" : "secondary"}>
                        {member.active ? "Aktivní" : "Neaktivní"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(member)}
                          data-testid={`button-edit-${member.id}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(member.id)}
                          data-testid={`button-delete-${member.id}`}
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
              {search ? "Žádní členové nenalezeni" : "Zatím žádní členové"}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isCreateOpen || isEditOpen} onOpenChange={(open) => {
        if (!open) {
          setIsCreateOpen(false);
          setIsEditOpen(false);
          setEditingStaff(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditOpen ? "Upravit člena" : "Nový člen personálu"}</DialogTitle>
            <DialogDescription>
              {isEditOpen ? "Upravte údaje člena personálu" : "Přidejte nového člena týmu"}
            </DialogDescription>
          </DialogHeader>
          <Form {...(isEditOpen ? editForm : createForm)}>
            <form
              onSubmit={(isEditOpen ? editForm : createForm).handleSubmit((data) =>
                isEditOpen && editingStaff
                  ? updateMutation.mutate({ id: editingStaff.id, data })
                  : createMutation.mutate(data)
              )}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={(isEditOpen ? editForm : createForm).control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jméno *</FormLabel>
                      <FormControl>
                        <Input placeholder="Jan" data-testid="input-first-name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={(isEditOpen ? editForm : createForm).control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Příjmení *</FormLabel>
                      <FormControl>
                        <Input placeholder="Novák" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={(isEditOpen ? editForm : createForm).control}
                name="email"
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
                control={(isEditOpen ? editForm : createForm).control}
                name="phone"
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
                control={(isEditOpen ? editForm : createForm).control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-role">
                          <SelectValue placeholder="Vyberte roli" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(STAFF_ROLE_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
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
                name="hourlyRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hodinová sazba (Kč)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="150"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                      />
                    </FormControl>
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
                    setEditingStaff(null);
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
