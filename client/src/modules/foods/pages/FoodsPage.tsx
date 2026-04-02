import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { queryClient } from "@/shared/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Badge } from "@/shared/components/ui/badge";
import { Edit, Plus, Trash2, Loader2 } from "lucide-react";
import { PageHeader } from "@/shared/components/PageHeader";
import type { ReservationFood } from "@shared/types";
import { successToast, errorToast } from "@/shared/lib/toast-helpers";
import { useAuth } from "@/modules/auth/contexts/AuthContext";

export default function Foods() {
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const { isSuperAdmin } = useAuth();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkActionOpen, setBulkActionOpen] = useState(false);
  const [bulkActionType, setBulkActionType] = useState<'delete' | null>(null);

  // Fetch foods
  const { data: foods, isLoading } = useQuery({
    queryKey: ["/api/reservation-foods"],
    queryFn: () => api.get<ReservationFood[]>("/api/reservation-foods"),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/reservation-foods/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reservation-foods"] });
      successToast("Jídlo bylo úspěšně smazáno");
    },
    onError: () => {
      errorToast("Chyba při mazání jídla");
    },
  });

  const handleDelete = (id: number) => {
    if (confirm("Opravdu chcete smazat toto jídlo?")) {
      deleteMutation.mutate(id);
    }
  };

  // Selection helpers
  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    const allIds = filteredFoods.map(f => f.id);
    if (allIds.every(id => selectedIds.has(id))) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allIds));
    }
  };
  const clearSelection = () => setSelectedIds(new Set());

  // Bulk mutations
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      return await api.delete('/api/reservation-foods/bulk-delete', { data: { ids } });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/reservation-foods"] });
      setBulkActionOpen(false);
      clearSelection();
      successToast(`Smazáno ${data.count} jídel`);
    },
    onError: (error: Error) => errorToast(error),
  });

  const executeBulkAction = () => {
    const ids = Array.from(selectedIds);
    if (bulkActionType === 'delete') {
      bulkDeleteMutation.mutate(ids);
    }
  };

  // Filter foods
  const filteredFoods =
    foods?.filter(
      (food) =>
        food.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        food.description?.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Jídla" description="Správa nabídky jídel, cen a dostupnosti">
        <Button
          onClick={() => navigate("/foods/new")}
          className="bg-primary hover:bg-primary/90"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nové jídlo
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>Menu položky</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              placeholder="Hledat jídlo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {isSuperAdmin && selectedIds.size > 0 && (
            <div className="flex items-center gap-2 p-3 mb-4 bg-primary/5 border rounded-lg">
              <Badge variant="secondary">{selectedIds.size} vybráno</Badge>
              <Button size="sm" variant="destructive" onClick={() => { setBulkActionType('delete'); setBulkActionOpen(true); }}>
                Smazat
              </Button>
              <Button size="sm" variant="ghost" onClick={clearSelection}>
                Zrušit výběr
              </Button>
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Načítání...</div>
          ) : filteredFoods.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {isSuperAdmin && (
                      <TableHead className="w-[40px]">
                        <Checkbox
                          checked={filteredFoods.length > 0 && filteredFoods.every(f => selectedIds.has(f.id))}
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
                    )}
                    <TableHead>Název</TableHead>
                    <TableHead>Popis</TableHead>
                    <TableHead>Základní cena</TableHead>
                    <TableHead>Příplatek</TableHead>
                    <TableHead>Typ</TableHead>
                    <TableHead>Externí ID</TableHead>
                    <TableHead className="text-right">Akce</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFoods.map((food) => (
                    <TableRow
                      key={food.id}
                      className={`cursor-pointer hover:bg-muted/50 ${selectedIds.has(food.id) ? 'bg-primary/5' : ''}`}
                      onClick={() => navigate(`/foods/${food.id}/edit`)}
                    >
                      {isSuperAdmin && (
                        <TableCell className="w-[40px]" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedIds.has(food.id)}
                            onCheckedChange={() => toggleSelect(food.id)}
                          />
                        </TableCell>
                      )}
                      <TableCell className="font-medium">{food.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {food.description || "-"}
                      </TableCell>
                      <TableCell className="font-mono">{food.price} Kč</TableCell>
                      <TableCell>
                        {food.surcharge > 0 ? (
                          <span className="inline-flex items-center rounded-full bg-orange-500/15 text-orange-600 px-2 py-1 text-xs font-medium border border-orange-500/30">
                            +{food.surcharge} Kč
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">v ceně</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {food.isChildrenMenu && (
                          <span className="inline-flex items-center rounded-full bg-blue-500/15 text-blue-600 px-2 py-1 text-xs font-medium border border-blue-500/30">
                            Dětské
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground font-mono">
                        {food.externalId || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <TooltipProvider>
                        <div className="flex items-center justify-end gap-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/foods/${food.id}/edit`);
                                }}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Upravit</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(food.id);
                                }}
                                className="text-destructive hover:text-destructive"
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
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Žádná jídla nenalezena
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk Delete Dialog */}
      <Dialog open={bulkActionOpen} onOpenChange={(open) => { setBulkActionOpen(open); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Smazat {selectedIds.size} jídel?</DialogTitle>
            <DialogDescription>Tato akce je nevratná.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkActionOpen(false)}>Zrušit</Button>
            <Button
              variant="destructive"
              onClick={executeBulkAction}
              disabled={bulkDeleteMutation.isPending}
            >
              {bulkDeleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Smazat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
