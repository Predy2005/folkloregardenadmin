import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { api } from "@/lib/api";
import type { CashboxEntry } from "@shared/types";
import { CASHBOX_TYPE_LABELS, CASHBOX_CATEGORY_LABELS } from "@shared/types";
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
import { Plus, Search, Wallet, TrendingUp, TrendingDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import dayjs from "dayjs";

const cashboxSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE"], { required_error: "Vyberte typ" }),
  category: z.string().min(1, "Vyberte kategorii"),
  amount: z.number().min(0.01, "Částka musí být větší než 0"),
  currency: z.enum(["CZK", "EUR"], { required_error: "Vyberte měnu" }),
  description: z.string().optional(),
  date: z.string().min(1, "Zadejte datum"),
});

type CashboxForm = z.infer<typeof cashboxSchema>;

export default function Cashbox() {
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [currencyFilter, setCurrencyFilter] = useState<string>("all");
  const { toast } = useToast();

  const { data: entries, isLoading } = useQuery<CashboxEntry[]>({
    queryKey: ["/api/cashbox"],
  });

  const createForm = useForm<CashboxForm>({
    resolver: zodResolver(cashboxSchema),
    defaultValues: {
      type: "INCOME",
      currency: "CZK",
      amount: 0,
      date: dayjs().format("YYYY-MM-DD"),
      description: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CashboxForm) => {
      return await api.post("/api/cashbox", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cashbox"] });
      setIsCreateOpen(false);
      createForm.reset();
      toast({
        title: "Úspěch",
        description: "Záznam byl vytvořen",
      });
    },
    onError: () => {
      toast({
        title: "Chyba",
        description: "Nepodařilo se vytvořit záznam",
        variant: "destructive",
      });
    },
  });

  const filteredEntries = entries?.filter((entry) => {
    const matchesSearch =
      entry.category.toLowerCase().includes(search.toLowerCase()) ||
      entry.description?.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "all" || entry.type === typeFilter;
    const matchesCurrency = currencyFilter === "all" || entry.currency === currencyFilter;
    return matchesSearch && matchesType && matchesCurrency;
  });

  const totalIncomeCZK = entries
    ?.filter((e) => e.type === "INCOME" && e.currency === "CZK")
    .reduce((sum, e) => sum + e.amount, 0) || 0;

  const totalExpenseCZK = entries
    ?.filter((e) => e.type === "EXPENSE" && e.currency === "CZK")
    .reduce((sum, e) => sum + e.amount, 0) || 0;

  const totalIncomeEUR = entries
    ?.filter((e) => e.type === "INCOME" && e.currency === "EUR")
    .reduce((sum, e) => sum + e.amount, 0) || 0;

  const totalExpenseEUR = entries
    ?.filter((e) => e.type === "EXPENSE" && e.currency === "EUR")
    .reduce((sum, e) => sum + e.amount, 0) || 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Pokladna</h1>
          <p className="text-muted-foreground">Správa příjmů a výdajů</p>
        </div>
        <Button
          onClick={() => setIsCreateOpen(true)}
          className="bg-gradient-to-r from-primary to-purple-600"
          data-testid="button-create-entry"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nový záznam
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Příjmy CZK</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {totalIncomeCZK.toLocaleString()} Kč
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Výdaje CZK</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {totalExpenseCZK.toLocaleString()} Kč
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Bilance CZK</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {(totalIncomeCZK - totalExpenseCZK).toLocaleString()} Kč
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Bilance EUR</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {(totalIncomeEUR - totalExpenseEUR).toLocaleString()} €
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="w-5 h-5" />
                Záznamy
              </CardTitle>
              <CardDescription>
                Celkem: {entries?.length || 0} záznamů
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-32" data-testid="select-type-filter">
                  <SelectValue placeholder="Typ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Vše</SelectItem>
                  <SelectItem value="INCOME">Příjmy</SelectItem>
                  <SelectItem value="EXPENSE">Výdaje</SelectItem>
                </SelectContent>
              </Select>
              <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
                <SelectTrigger className="w-32" data-testid="select-currency-filter">
                  <SelectValue placeholder="Měna" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Vše</SelectItem>
                  <SelectItem value="CZK">CZK</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Hledat..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 w-64"
                  data-testid="input-search-entries"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Načítání...</div>
          ) : filteredEntries && filteredEntries.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Datum</TableHead>
                  <TableHead>Typ</TableHead>
                  <TableHead>Kategorie</TableHead>
                  <TableHead className="text-right">Částka</TableHead>
                  <TableHead>Popis</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.map((entry) => (
                  <TableRow key={entry.id} data-testid={`row-entry-${entry.id}`}>
                    <TableCell>
                      {dayjs(entry.date).format("DD.MM.YYYY")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={entry.type === "INCOME" ? "default" : "destructive"}>
                        {entry.type === "INCOME" ? (
                          <TrendingUp className="w-3 h-3 mr-1" />
                        ) : (
                          <TrendingDown className="w-3 h-3 mr-1" />
                        )}
                        {CASHBOX_TYPE_LABELS[entry.type]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {CASHBOX_CATEGORY_LABELS[entry.category] || entry.category}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      <span className={
                        entry.type === "INCOME"
                          ? "text-green-600"
                          : "text-red-600"
                      }>
                        {entry.type === "INCOME" ? "+" : "-"}
                        {entry.amount.toLocaleString()} {entry.currency}
                      </span>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-muted-foreground max-w-xs truncate">
                        {entry.description || "-"}
                      </p>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {search || typeFilter !== "all" || currencyFilter !== "all"
                ? "Žádné záznamy nenalezeny"
                : "Zatím žádné záznamy"}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nový záznam</DialogTitle>
            <DialogDescription>Přidejte příjem nebo výdaj</DialogDescription>
          </DialogHeader>
          <Form {...createForm}>
            <form
              onSubmit={createForm.handleSubmit((data) => createMutation.mutate(data))}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={createForm.control}
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
                          <SelectItem value="INCOME">Příjem</SelectItem>
                          <SelectItem value="EXPENSE">Výdaj</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Měna *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-currency">
                            <SelectValue placeholder="Vyberte měnu" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="CZK">CZK</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={createForm.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kategorie *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-category">
                          <SelectValue placeholder="Vyberte kategorii" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(CASHBOX_CATEGORY_LABELS).map(([value, label]) => (
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
                control={createForm.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Částka *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="1000"
                        data-testid="input-amount"
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
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Datum *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Popis</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Popis záznamu" {...field} />
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
    </div>
  );
}
