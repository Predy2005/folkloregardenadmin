import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { queryClient } from "@/shared/lib/queryClient";
import { successToast, errorToast } from "@/shared/lib/toast-helpers";
import * as XLSX from "xlsx";
import type { StaffMember } from "@shared/types";
import { translateStaffRole, STAFF_ROLE_LABELS } from "@modules/staff/utils/staffRoles";
import { formatCurrency } from "@/shared/lib/formatting";
import { useAuth } from "@modules/auth";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badge";
import { Checkbox } from "@/shared/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Label } from "@/shared/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { PageHeader } from "@/shared/components/PageHeader";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Users,
  Loader2,
  Filter,
  X,
  FileSpreadsheet,
  Download,
  Briefcase,
} from "lucide-react";
import { ImportStaffDialog } from "@modules/staff/dialogs/ImportStaffDialog";
import { MultiSelectFilter } from "@/shared/components/MultiSelectFilter";

const POSITION_OPTIONS = Object.entries(STAFF_ROLE_LABELS)
  .filter(([key]) => key === key.toUpperCase())
  .map(([value, label]) => ({ value, label }));

const STATUS_OPTIONS = [
  { value: "active", label: "Aktivní" },
  { value: "inactive", label: "Neaktivní" },
];

const RATE_TYPE_OPTIONS = [
  { value: "hourly", label: "Hodinová" },
  { value: "fixed", label: "Fixní" },
  { value: "none", label: "Bez sazby" },
];

const GROUP_TYPE_OPTIONS = [
  { value: "individual", label: "Jednotlivec" },
  { value: "group", label: "Skupina" },
];

export default function StaffMembers() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const { hasPermission } = useAuth();
  const canUpdate = hasPermission("staff.update");
  const canDelete = hasPermission("staff.delete");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkActionOpen, setBulkActionOpen] = useState(false);
  const [bulkActionType, setBulkActionType] = useState<"status" | "position" | "delete" | null>(null);
  const [bulkValue, setBulkValue] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [positionFilter, setPositionFilter] = useState<Set<string>>(new Set());
  const [rateTypeFilter, setRateTypeFilter] = useState<Set<string>>(new Set());
  const [groupFilter, setGroupFilter] = useState<Set<string>>(new Set());

  const activeFilterCount =
    (statusFilter.size > 0 ? 1 : 0) +
    (positionFilter.size > 0 ? 1 : 0) +
    (rateTypeFilter.size > 0 ? 1 : 0) +
    (groupFilter.size > 0 ? 1 : 0);
  const clearFilters = () => {
    setStatusFilter(new Set());
    setPositionFilter(new Set());
    setRateTypeFilter(new Set());
    setGroupFilter(new Set());
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((m) => m.id)));
    }
  };

  const clearSelection = () => setSelectedIds(new Set());

  const { data: staff, isLoading } = useQuery<StaffMember[]>({
    queryKey: ["/api/staff"],
    queryFn: () => api.get("/api/staff"),
  });

  const uniquePositions = useMemo(() => {
    if (!staff) return [];
    const positions = new Set(staff.map(m => m.position).filter(Boolean) as string[]);
    return Array.from(positions).sort((a, b) => translateStaffRole(a).localeCompare(translateStaffRole(b), "cs"));
  }, [staff]);

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/staff/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      successToast("Člen personálu smazán");
    },
    onError: (error: Error) => errorToast(error),
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: (payload: { ids: number[]; updates: Record<string, string | boolean> }) =>
      api.put("/api/staff/bulk-update", payload),
    onSuccess: (data: { count: number }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      successToast(`Aktualizováno ${data.count} členů`);
      clearSelection();
      setBulkActionOpen(false);
    },
    onError: (error: Error) => errorToast(error),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: number[]) =>
      api.delete("/api/staff/bulk-delete", { data: { ids } }),
    onSuccess: (data: { count: number }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      successToast(`Smazáno ${data.count} členů`);
      clearSelection();
      setBulkActionOpen(false);
    },
    onError: (error: Error) => errorToast(error),
  });

  const handleExportSelected = () => {
    if (!staff) return;
    const selected = staff.filter((m) => selectedIds.has(m.id));
    if (selected.length === 0) {
      errorToast("Nic není vybráno");
      return;
    }
    const rows = selected.map((m) => ({
      "Jméno": m.firstName,
      "Příjmení": m.lastName,
      "Email": m.email ?? "",
      "Telefon": m.phone ?? "",
      "Pozice": m.position ? translateStaffRole(m.position) : "",
      "Hodinová sazba": m.hourlyRate ? Number(m.hourlyRate) : "",
      "Fixní sazba": m.fixedRate ? Number(m.fixedRate) : "",
      "Skupina": m.isGroup ? "ano" : "ne",
      "Velikost skupiny": m.groupSize ?? "",
      "Stav": m.isActive ? "aktivní" : "neaktivní",
      "Adresa": m.address ?? "",
      "Datum narození": m.dateOfBirth ?? "",
      "Poznámky": m.notes ?? "",
    }));
    const sheet = XLSX.utils.json_to_sheet(rows);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Personál");
    const stamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(book, `personal_${stamp}.xlsx`);
    successToast(`Exportováno ${selected.length} členů`);
  };

  const filtered = useMemo(() => {
    if (!staff) return [];
    let result = staff;

    if (search) {
      const term = search.toLowerCase();
      result = result.filter((m) =>
        `${m.firstName} ${m.lastName}`.toLowerCase().includes(term) ||
        m.email?.toLowerCase().includes(term) ||
        m.phone?.toLowerCase().includes(term) ||
        m.position?.toLowerCase().includes(term)
      );
    }

    // Multi-select filtry: prázdná množina = "vše", neprázdná = jen vybrané hodnoty (OR mezi položkami v rámci filtru, AND mezi filtry).
    if (statusFilter.size > 0) {
      result = result.filter(m =>
        (statusFilter.has("active") && m.isActive) ||
        (statusFilter.has("inactive") && !m.isActive)
      );
    }
    if (positionFilter.size > 0) {
      result = result.filter(m => m.position && positionFilter.has(m.position));
    }
    if (rateTypeFilter.size > 0) {
      result = result.filter(m => {
        const hourly = m.hourlyRate ? parseFloat(String(m.hourlyRate)) : 0;
        const fixed = m.fixedRate ? parseFloat(String(m.fixedRate)) : 0;
        return (
          (rateTypeFilter.has("hourly") && hourly > 0) ||
          (rateTypeFilter.has("fixed") && fixed > 0) ||
          (rateTypeFilter.has("none") && hourly === 0 && fixed === 0)
        );
      });
    }
    if (groupFilter.size > 0) {
      result = result.filter(m =>
        (groupFilter.has("group") && m.isGroup) ||
        (groupFilter.has("individual") && !m.isGroup)
      );
    }

    return result;
  }, [staff, search, statusFilter, positionFilter, rateTypeFilter, groupFilter]);

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Personál" description={`${staff?.length ?? 0} členů`}>
        <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Import z Excelu
        </Button>
        <Button onClick={() => navigate("/staff/new")}>
          <Plus className="w-4 h-4 mr-2" />
          Přidat
        </Button>
      </PageHeader>

      <ImportStaffDialog open={importDialogOpen} onOpenChange={setImportDialogOpen} />

      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 p-3 bg-muted rounded-lg">
          <Badge variant="secondary">{selectedIds.size} vybráno</Badge>
          {canUpdate && (
            <Button
              size="sm"
              onClick={() => {
                setBulkActionType("status");
                setBulkValue("");
                setBulkActionOpen(true);
              }}
            >
              Aktivovat/Deaktivovat
            </Button>
          )}
          {canUpdate && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setBulkActionType("position");
                setBulkValue("");
                setBulkActionOpen(true);
              }}
            >
              <Briefcase className="w-4 h-4 mr-1" />
              Změnit pozici
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportSelected}
          >
            <Download className="w-4 h-4 mr-1" />
            Exportovat
          </Button>
          {canDelete && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                setBulkActionType("delete");
                setBulkActionOpen(true);
              }}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Smazat
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={clearSelection}>
            Zrušit výběr
          </Button>
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          {/* Search + Filter toggle */}
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Hledat jméno, email, telefon, pozici..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              variant={showFilters ? "secondary" : "outline"}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4 mr-1" />
              Filtry
              {activeFilterCount > 0 && (
                <Badge variant="default" className="ml-1 h-5 px-1.5 text-xs">{activeFilterCount}</Badge>
              )}
            </Button>
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="w-4 h-4 mr-1" />
                Zrušit filtry
              </Button>
            )}
          </div>

          {/* Filter bar — multi-select pro každou kategorii. Prázdný = "vše". */}
          {showFilters && (
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <MultiSelectFilter
                label="Stav"
                options={STATUS_OPTIONS}
                selected={statusFilter}
                onChange={setStatusFilter}
              />
              <MultiSelectFilter
                label="Pozice"
                options={uniquePositions.map(pos => ({ value: pos, label: translateStaffRole(pos) }))}
                selected={positionFilter}
                onChange={setPositionFilter}
              />
              <MultiSelectFilter
                label="Sazba"
                options={RATE_TYPE_OPTIONS}
                selected={rateTypeFilter}
                onChange={setRateTypeFilter}
              />
              <MultiSelectFilter
                label="Typ"
                options={GROUP_TYPE_OPTIONS}
                selected={groupFilter}
                onChange={setGroupFilter}
              />
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {search || activeFilterCount > 0 ? "Žádní členové nenalezeni" : "Zatím žádní členové"}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={filtered.length > 0 && selectedIds.size === filtered.length}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Jméno</TableHead>
                    <TableHead>Pozice</TableHead>
                    <TableHead>Kontakt</TableHead>
                    <TableHead>Sazba</TableHead>
                    <TableHead className="text-center">Stav</TableHead>
                    <TableHead className="text-right">Akce</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((member) => {
                    const hourly = member.hourlyRate ? parseFloat(String(member.hourlyRate)) : 0;
                    const fixed = member.fixedRate ? parseFloat(String(member.fixedRate)) : 0;

                    return (
                      <TableRow
                        key={member.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/staff/${member.id}/edit`)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedIds.has(member.id)}
                            onCheckedChange={() => toggleSelect(member.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div>
                              <div className="font-medium">
                                {member.firstName} {member.lastName}
                              </div>
                              {member.isGroup && (
                                <Badge variant="outline" className="text-[10px] mt-0.5">
                                  <Users className="w-2.5 h-2.5 mr-1" />
                                  Skupina{member.groupSize ? ` (${member.groupSize})` : ""}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {member.position ? translateStaffRole(member.position) : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {member.email && <div>{member.email}</div>}
                            {member.phone && <div className="text-muted-foreground">{member.phone}</div>}
                          </div>
                        </TableCell>
                        <TableCell>
                          {fixed > 0 ? (
                            <span className="text-sm font-mono">{formatCurrency(fixed)} fixní</span>
                          ) : hourly > 0 ? (
                            <span className="text-sm font-mono">{formatCurrency(hourly)}/h</span>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={member.isActive ? "default" : "secondary"} className={member.isActive ? "bg-green-600" : ""}>
                            {member.isActive ? "Aktivní" : "Neaktivní"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => navigate(`/staff/${member.id}/edit`)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => {
                                if (confirm(`Smazat ${member.firstName} ${member.lastName}?`)) {
                                  deleteMutation.mutate(member.id);
                                }
                              }}
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
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk Status Dialog */}
      <Dialog open={bulkActionOpen && bulkActionType === "status"} onOpenChange={setBulkActionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hromadná změna stavu</DialogTitle>
            <DialogDescription>
              Změna stavu pro {selectedIds.size} vybraných členů personálu.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <Label>Stav</Label>
            <Select value={bulkValue} onValueChange={setBulkValue}>
              <SelectTrigger>
                <SelectValue placeholder="Vyberte stav..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Aktivní</SelectItem>
                <SelectItem value="false">Neaktivní</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkActionOpen(false)}>
              Zrušit
            </Button>
            <Button
              onClick={() =>
                bulkUpdateMutation.mutate({
                  ids: Array.from(selectedIds),
                  updates: { isActive: bulkValue === "true" },
                })
              }
              disabled={!bulkValue || bulkUpdateMutation.isPending}
            >
              {bulkUpdateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Uložit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Position Dialog */}
      <Dialog open={bulkActionOpen && bulkActionType === "position"} onOpenChange={setBulkActionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hromadná změna pozice</DialogTitle>
            <DialogDescription>
              Změna pozice pro {selectedIds.size} vybraných členů personálu.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <Label>Pozice</Label>
            <Select value={bulkValue} onValueChange={setBulkValue}>
              <SelectTrigger>
                <SelectValue placeholder="Vyberte pozici..." />
              </SelectTrigger>
              <SelectContent>
                {POSITION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkActionOpen(false)}>
              Zrušit
            </Button>
            <Button
              onClick={() =>
                bulkUpdateMutation.mutate({
                  ids: Array.from(selectedIds),
                  updates: { position: bulkValue },
                })
              }
              disabled={!bulkValue || bulkUpdateMutation.isPending}
            >
              {bulkUpdateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Uložit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Dialog */}
      <Dialog open={bulkActionOpen && bulkActionType === "delete"} onOpenChange={setBulkActionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hromadné smazání personálu</DialogTitle>
            <DialogDescription>
              Opravdu chcete smazat {selectedIds.size} vybraných členů personálu? Tato akce je nevratná.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkActionOpen(false)}>
              Zrušit
            </Button>
            <Button
              variant="destructive"
              onClick={() => bulkDeleteMutation.mutate(Array.from(selectedIds))}
              disabled={bulkDeleteMutation.isPending}
            >
              {bulkDeleteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Smazat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
