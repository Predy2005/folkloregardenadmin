import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { api } from "@/shared/lib/api";
import type { TransportCompany } from "@shared/types";
import { useCrudMutations } from "@/shared/hooks/useCrudMutations";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Checkbox } from "@/shared/components/ui/checkbox";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/components/ui/tooltip";
import { Plus, Pencil, Trash2, Search, Truck, ChevronDown, Power, PowerOff } from "lucide-react";
import { PageHeader } from "@/shared/components/PageHeader";
import { Badge } from "@/shared/components/ui/badge";
import { useToast } from "@/shared/hooks/use-toast";
import { errorToast } from "@/shared/lib/toast-helpers";
import { formatCurrency } from "@/shared/lib/formatting";

export default function TransportCompaniesPage() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: companies, isLoading } = useQuery<TransportCompany[]>({
    queryKey: ["/api/transport"],
    queryFn: () => api.get<TransportCompany[]>("/api/transport"),
  });

  const { deleteMutation } = useCrudMutations<Record<string, unknown>>({
    endpoint: "/api/transport",
    queryKey: ["/api/transport"],
    entityName: "Dopravce",
  });

  const bulkMutation = useMutation({
    mutationFn: (data: { ids: number[]; action: string }) =>
      api.post("/api/transport/bulk", data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["/api/transport"] });
      setSelected(new Set());
      const labels: Record<string, string> = {
        activate: "aktivovano",
        deactivate: "deaktivovano",
        delete: "smazano",
      };
      toast({ title: `Hromadna akce: ${variables.ids.length} dopravcu ${labels[variables.action]}` });
    },
    onError: (error: Error) => errorToast(error),
  });

  const filteredCompanies = companies?.filter((company) =>
    company.name.toLowerCase().includes(search.toLowerCase()) ||
    (company.contactPerson || "").toLowerCase().includes(search.toLowerCase()) ||
    (company.ic || "").toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = (id: number) => {
    if (confirm("Opravdu chcete smazat tohoto dopravce?")) {
      deleteMutation.mutate(id);
    }
  };

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!filteredCompanies) return;
    if (selected.size === filteredCompanies.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredCompanies.map((c) => c.id)));
    }
  };

  const handleBulkAction = (action: string) => {
    if (selected.size === 0) return;
    if (action === "delete" && !confirm(`Opravdu smazat ${selected.size} dopravcu?`)) return;
    bulkMutation.mutate({ ids: Array.from(selected), action });
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Doprava" description="Sprava dopravnich spolecnosti, vozidel a ridicu">
        <Button
          onClick={() => navigate("/transport/new")}
          className="bg-primary hover:bg-primary/90"
          data-testid="button-create-transport"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novy dopravce
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Truck className="w-5 h-5" />
                Dopravci
              </CardTitle>
              <CardDescription>
                Celkem: {companies?.length || 0} dopravcu
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {/* Bulk actions */}
              {selected.size > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      Hromadne ({selected.size})
                      <ChevronDown className="w-4 h-4 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleBulkAction("activate")}>
                      <Power className="w-4 h-4 mr-2" />
                      Aktivovat
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkAction("deactivate")}>
                      <PowerOff className="w-4 h-4 mr-2" />
                      Deaktivovat
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleBulkAction("delete")}
                      className="text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Smazat
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Hledat dopravce..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 w-64"
                  data-testid="input-search-transport"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Nacitani...</div>
          ) : filteredCompanies && filteredCompanies.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={filteredCompanies.length > 0 && selected.size === filteredCompanies.length}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Nazev</TableHead>
                  <TableHead>Kontakt</TableHead>
                  <TableHead>Telefon</TableHead>
                  <TableHead className="text-right">Vozidla</TableHead>
                  <TableHead className="text-right">Ridici</TableHead>
                  <TableHead className="text-right">Akce</TableHead>
                  <TableHead className="text-right">Trzba</TableHead>
                  <TableHead>Stav</TableHead>
                  <TableHead className="text-right">Akce</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCompanies.map((company) => (
                  <TableRow
                    key={company.id}
                    data-testid={`row-transport-${company.id}`}
                    className="cursor-pointer"
                    onClick={() => navigate(`/transport/${company.id}/edit`)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selected.has(company.id)}
                        onCheckedChange={() => toggleSelect(company.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{company.name}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {company.contactPerson && (
                          <div className="font-medium">{company.contactPerson}</div>
                        )}
                        <div className="text-muted-foreground">{company.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>{company.phone}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline">{company.vehicleCount ?? 0}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline">{company.driverCount ?? 0}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary">{company.eventCount ?? 0}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(company.totalRevenue ?? 0)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={company.isActive ? "default" : "secondary"}>
                        {company.isActive ? "Aktivni" : "Neaktivni"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <TooltipProvider>
                      <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => navigate(`/transport/${company.id}/edit`)}
                              data-testid={`button-edit-${company.id}`}
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
                              onClick={() => handleDelete(company.id)}
                              data-testid={`button-delete-${company.id}`}
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
              {search ? "Zadni dopravci nenalezeni" : "Zatim zadni dopravci"}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
