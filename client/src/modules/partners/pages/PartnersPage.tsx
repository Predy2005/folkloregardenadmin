import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { api } from "@/shared/lib/api";
import type { Partner } from "@shared/types";
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
import { Plus, Pencil, Trash2, Search, Users2, ChevronDown, Power, PowerOff } from "lucide-react";
import { PageHeader } from "@/shared/components/PageHeader";
import { Badge } from "@/shared/components/ui/badge";
import { useToast } from "@/shared/hooks/use-toast";

const PARTNER_TYPE_LABELS: Record<string, string> = {
  HOTEL: "Hotel",
  RECEPTION: "Recepce",
  DISTRIBUTOR: "Distributor",
  OTHER: "Ostatni",
};

const PRICING_MODEL_LABELS: Record<string, string> = {
  DEFAULT: "Systemove ceny",
  CUSTOM: "Vlastni ceny",
  FLAT: "Jednotna cena",
};

const BILLING_PERIOD_LABELS: Record<string, string> = {
  PER_RESERVATION: "Za rezervaci",
  MONTHLY: "Mesicne",
  QUARTERLY: "Ctvrtletne",
};

export default function Partners() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: partners, isLoading } = useQuery<Partner[]>({
    queryKey: ["/api/partner"],
    queryFn: () => api.get<Partner[]>("/api/partner"),
  });

  const { deleteMutation } = useCrudMutations<any>({
    endpoint: "/api/partner",
    queryKey: ["/api/partner"],
    entityName: "Partner",
  });

  const bulkMutation = useMutation({
    mutationFn: (data: { ids: number[]; action: string }) =>
      api.post("/api/partner/bulk", data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["/api/partner"] });
      setSelected(new Set());
      const labels: Record<string, string> = {
        activate: "aktivovano",
        deactivate: "deaktivovano",
        delete: "smazano",
      };
      toast({ title: `Hromadna akce: ${variables.ids.length} partneru ${labels[variables.action]}` });
    },
  });

  const filteredPartners = partners?.filter((partner) =>
    partner.name.toLowerCase().includes(search.toLowerCase()) ||
    (partner.email || "").toLowerCase().includes(search.toLowerCase()) ||
    (partner.contactPerson || "").toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = (id: number) => {
    if (confirm("Opravdu chcete smazat tohoto partnera?")) {
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
    if (!filteredPartners) return;
    if (selected.size === filteredPartners.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredPartners.map((p) => p.id)));
    }
  };

  const handleBulkAction = (action: string) => {
    if (selected.size === 0) return;
    if (action === "delete" && !confirm(`Opravdu smazat ${selected.size} partneru?`)) return;
    bulkMutation.mutate({ ids: Array.from(selected), action });
  };

  const pricingModelBadgeVariant = (model?: string) => {
    switch (model) {
      case "CUSTOM": return "default" as const;
      case "FLAT": return "secondary" as const;
      default: return "outline" as const;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Partneri" description="Sprava affiliate partneru, cen a provizi">
        <Button
          onClick={() => navigate("/partners/new")}
          className="bg-primary hover:bg-primary/90"
          data-testid="button-create-partner"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novy partner
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users2 className="w-5 h-5" />
                Partneri
              </CardTitle>
              <CardDescription>
                Celkem: {partners?.length || 0} partneru
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
            <div className="text-center py-8 text-muted-foreground">Nacitani...</div>
          ) : filteredPartners && filteredPartners.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={filteredPartners.length > 0 && selected.size === filteredPartners.length}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Nazev</TableHead>
                  <TableHead>Typ</TableHead>
                  <TableHead>Kontakt</TableHead>
                  <TableHead>Cenovy model</TableHead>
                  <TableHead>Fakturace</TableHead>
                  <TableHead>Provize</TableHead>
                  <TableHead>Stav</TableHead>
                  <TableHead className="text-right">Akce</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPartners.map((partner) => (
                  <TableRow
                    key={partner.id}
                    data-testid={`row-partner-${partner.id}`}
                    className="cursor-pointer"
                    onClick={() => navigate(`/partners/${partner.id}/edit`)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selected.has(partner.id)}
                        onCheckedChange={() => toggleSelect(partner.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{partner.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {PARTNER_TYPE_LABELS[partner.partnerType] || partner.partnerType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {partner.contactPerson && (
                          <div className="font-medium">{partner.contactPerson}</div>
                        )}
                        <div className="text-muted-foreground">{partner.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={pricingModelBadgeVariant(partner.pricingModel)}>
                        {PRICING_MODEL_LABELS[partner.pricingModel] || "Systemove ceny"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {BILLING_PERIOD_LABELS[partner.billingPeriod] || "Za rezervaci"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {partner.commissionRate}%
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={partner.isActive ? "default" : "secondary"}>
                        {partner.isActive ? "Aktivni" : "Neaktivni"}
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
                              onClick={() => navigate(`/partners/${partner.id}/edit`)}
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
              {search ? "Zadni partneri nenalezeni" : "Zatim zadni partneri"}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
