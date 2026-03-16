import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { StockMovement, StockItem } from "@shared/types";
import { STOCK_MOVEMENT_TYPE_LABELS } from "@shared/types";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Search, ArrowUpDown, TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import { PageHeader } from "@/shared/components/PageHeader";
import { Badge } from "@/shared/components/ui/badge";
import { Textarea } from "@/shared/components/ui/textarea";
import dayjs from "dayjs";
import { useFormDialog } from "@/shared/hooks/useFormDialog";
import { useCrudMutations } from "@/shared/hooks/useCrudMutations";

const stockMovementSchema = z.object({
  stockItemId: z.number().min(1, "Vyberte skladovou položku"),
  movementType: z.enum(["IN", "OUT", "ADJUSTMENT"], { required_error: "Vyberte typ pohybu" }),
  quantity: z.number().min(0.01, "Množství musí být větší než 0"),
  reason: z.string().optional(),
});

type StockMovementForm = z.infer<typeof stockMovementSchema>;

export default function StockMovements() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const dialog = useFormDialog<StockMovement>();

  const { data: movements, isLoading } = useQuery<StockMovement[]>({
    queryKey: ["/api/stock-movements"],
  });

  const { data: stockItems } = useQuery<StockItem[]>({
    queryKey: ["/api/stock-items"],
  });

  const form = useForm<StockMovementForm>({
    resolver: zodResolver(stockMovementSchema),
    defaultValues: {
      movementType: "IN",
      quantity: 0,
      reason: "",
    },
  });

  const { createMutation, isPending } = useCrudMutations<StockMovementForm>({
    endpoint: "/api/stock-movements",
    queryKey: ["/api/stock-movements"],
    entityName: "Pohyb skladu",
    extraInvalidateKeys: [["/api/stock-items"]],
    onCreateSuccess: () => { dialog.close(); form.reset(); },
  });

  const filteredMovements = movements?.filter((movement) => {
    const matchesSearch = movement.stockItem?.name.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "all" || movement.movementType === typeFilter;
    return matchesSearch && matchesType;
  });

  const getMovementIcon = (type: StockMovement['movementType']) => {
    switch (type) {
      case 'IN':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'OUT':
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      case 'ADJUSTMENT':
        return <RefreshCw className="w-4 h-4 text-blue-600" />;
    }
  };

  const getMovementBadgeVariant = (type: StockMovement['movementType']) => {
    switch (type) {
      case 'IN':
        return 'default';
      case 'OUT':
        return 'destructive';
      case 'ADJUSTMENT':
        return 'secondary';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Pohyby skladu" description="Historie příjmů, výdejů a úprav">
        <Button
          onClick={() => { dialog.openCreate(); form.reset(); }}
          className="bg-gradient-to-r from-primary to-purple-600"
          data-testid="button-create-stock-movement"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nový pohyb
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ArrowUpDown className="w-5 h-5" />
                Pohyby skladu
              </CardTitle>
              <CardDescription>
                Celkem: {movements?.length || 0} pohybů
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-48" data-testid="select-type-filter">
                  <SelectValue placeholder="Všechny typy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Všechny typy</SelectItem>
                  <SelectItem value="IN">Příjmy</SelectItem>
                  <SelectItem value="OUT">Výdeje</SelectItem>
                  <SelectItem value="ADJUSTMENT">Opravy</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Hledat položku..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 w-64"
                  data-testid="input-search-movements"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Načítání...</div>
          ) : filteredMovements && filteredMovements.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Datum</TableHead>
                  <TableHead>Typ</TableHead>
                  <TableHead>Položka</TableHead>
                  <TableHead className="text-right">Množství</TableHead>
                  <TableHead>Důvod</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMovements.map((movement) => (
                  <TableRow key={movement.id} data-testid={`row-movement-${movement.id}`}>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">
                          {dayjs(movement.createdAt).format("DD.MM.YYYY")}
                        </div>
                        <div className="text-muted-foreground">
                          {dayjs(movement.createdAt).format("HH:mm")}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getMovementBadgeVariant(movement.movementType)}>
                        <div className="flex items-center gap-1">
                          {getMovementIcon(movement.movementType)}
                          <span>{STOCK_MOVEMENT_TYPE_LABELS[movement.movementType]}</span>
                        </div>
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {movement.stockItem?.name || `ID: ${movement.stockItemId}`}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={
                        movement.movementType === 'IN'
                          ? 'text-green-600 font-medium'
                          : movement.movementType === 'OUT'
                          ? 'text-red-600 font-medium'
                          : 'text-blue-600 font-medium'
                      }>
                        {movement.movementType === 'OUT' ? '-' : '+'}
                        {movement.quantity} {movement.stockItem?.unit}
                      </span>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-muted-foreground max-w-xs truncate">
                        {movement.reason || "-"}
                      </p>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {search || typeFilter !== "all" ? "Žádné pohyby nenalezeny" : "Zatím žádné pohyby"}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={dialog.isOpen} onOpenChange={(open) => { if (!open) dialog.close(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nový pohyb skladu</DialogTitle>
            <DialogDescription>Zaznamenejte příjem, výdej nebo opravu zásob</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((data) => createMutation.mutate(data))}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="stockItemId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Skladová položka *</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-stock-item">
                          <SelectValue placeholder="Vyberte položku" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {stockItems?.map((item) => (
                          <SelectItem key={item.id} value={item.id.toString()}>
                            {item.name} ({item.quantityAvailable} {item.unit})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="movementType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Typ pohybu *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-movement-type">
                          <SelectValue placeholder="Vyberte typ" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="IN">Příjem</SelectItem>
                        <SelectItem value="OUT">Výdej</SelectItem>
                        <SelectItem value="ADJUSTMENT">Oprava</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Množství *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="0"
                        data-testid="input-quantity"
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
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Důvod</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Důvod pohybu" {...field} />
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
                  {isPending ? "Vytváření..." : "Vytvořit"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
