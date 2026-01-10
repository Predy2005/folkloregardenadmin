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
import { Edit, Plus, Trash2 } from "lucide-react";
import type { ReservationFood } from "@shared/types";
import { useToast } from "@/shared/hooks/use-toast";

export default function Foods() {
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

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
      toast({ title: "Jídlo bylo úspěšně smazáno" });
    },
    onError: () => {
      toast({ title: "Chyba při mazání jídla", variant: "destructive" });
    },
  });

  const handleDelete = (id: number) => {
    if (confirm("Opravdu chcete smazat toto jídlo?")) {
      deleteMutation.mutate(id);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            Jídla
          </h1>
          <p className="text-muted-foreground mt-1">
            Správa nabídky jídel, cen a dostupnosti
          </p>
        </div>
        <Button
          onClick={() => navigate("/foods/new")}
          className="bg-gradient-to-r from-primary to-purple-600"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nové jídlo
        </Button>
      </div>

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

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Načítání...</div>
          ) : filteredFoods.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
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
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/foods/${food.id}/edit`)}
                    >
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
    </div>
  );
}
