import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/shared/components/ui/dialog";
import { Badge } from "@/shared/components/ui/badge";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import { Loader2, Wand2, Check, X, Trash2, BarChart3 } from "lucide-react";
import { api } from "@/shared/lib/api";
import { useToast } from "@/shared/hooks/use-toast";
import { NationalityBadge, getNationalityColor } from "./waiter";

interface SeatingProposal {
  tableId: number;
  guestIds: number[];
  nationality: string;
  fillRate: number;
}

interface UnassignedGuest {
  id: number;
  firstName: string | null;
  lastName: string | null;
  nationality: string | null;
}

interface SeatingStats {
  totalGuests: number;
  assignedGuests: number;
  unassignedGuests: number;
  tableUtilization: number;
  nationalityDistribution: Record<string, number>;
}

interface SeatingWizardProps {
  eventId: number;
  tables: Array<{ id: number; tableNumber: string; capacity: number }>;
}

export default function SeatingWizard({ eventId, tables }: SeatingWizardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [proposals, setProposals] = useState<SeatingProposal[]>([]);
  const [unassigned, setUnassigned] = useState<UnassignedGuest[]>([]);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch seating stats
  const { data: stats, isLoading: statsLoading } = useQuery<SeatingStats>({
    queryKey: ["/api/events", eventId, "seating-stats"],
    queryFn: async () => api.get(`/api/events/${eventId}/seating-stats`),
    enabled: isOpen,
  });

  // Generate suggestion mutation
  const generateMutation = useMutation({
    mutationFn: async () => api.post<{ proposals: SeatingProposal[]; unassigned: UnassignedGuest[] }>(
      `/api/events/${eventId}/seating-suggestion`,
      {}
    ),
    onSuccess: (data) => {
      setProposals(data.proposals);
      setUnassigned(data.unassigned);
      toast({
        title: "Návrh vygenerován",
        description: `${data.proposals.length} přiřazení navrženo`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Chyba",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Apply suggestion mutation
  const applyMutation = useMutation({
    mutationFn: async () => api.put(`/api/events/${eventId}/seating-apply`, {
      assignments: proposals.map((p) => ({
        tableId: p.tableId,
        guestIds: p.guestIds,
      })),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      toast({
        title: "Rozsazení aplikováno",
        description: "Hosté byli přiřazeni ke stolům",
      });
      setIsOpen(false);
      setProposals([]);
      setUnassigned([]);
    },
    onError: (error: Error) => {
      toast({
        title: "Chyba",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Clear seating mutation
  const clearMutation = useMutation({
    mutationFn: async () => api.delete(`/api/events/${eventId}/seating-clear`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      toast({
        title: "Rozsazení vymazáno",
        description: "Všichni hosté byli odebráni ze stolů",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Chyba",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Get table info by ID
  const getTableInfo = (tableId: number) => {
    return tables.find((t) => t.id === tableId);
  };

  // Remove a proposal
  const removeProposal = (index: number) => {
    const removed = proposals[index];
    setProposals((prev) => prev.filter((_, i) => i !== index));
    // Add guests back to unassigned
    // (In a real implementation, we'd track guest names)
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Wand2 className="h-4 w-4" />
          Návrh rozsazení
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Wizard rozsazení</DialogTitle>
          <DialogDescription>
            Automatický návrh rozsazení hostů podle nacionality
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Stats Card */}
          {statsLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : stats ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Aktuální stav
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold">{stats.totalGuests}</p>
                    <p className="text-xs text-muted-foreground">Celkem hostů</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">{stats.assignedGuests}</p>
                    <p className="text-xs text-muted-foreground">Přiřazeno</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-orange-600">{stats.unassignedGuests}</p>
                    <p className="text-xs text-muted-foreground">Nepřiřazeno</p>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-xs text-muted-foreground mb-2">Nacionality:</p>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(stats.nationalityDistribution).map(([nat, count]) => (
                      <div key={nat} className="flex items-center gap-1">
                        <NationalityBadge nationality={nat} size="sm" />
                        <span className="text-xs">({count})</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              className="flex-1"
            >
              {generateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Wand2 className="h-4 w-4 mr-2" />
              )}
              Vygenerovat návrh
            </Button>
            <Button
              variant="destructive"
              onClick={() => clearMutation.mutate()}
              disabled={clearMutation.isPending}
            >
              {clearMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Proposals */}
          {proposals.length > 0 && (
            <ScrollArea className="h-[300px] border rounded-lg p-4">
              <div className="space-y-2">
                <p className="text-sm font-medium mb-3">
                  Navržená přiřazení ({proposals.length})
                </p>
                {proposals.map((proposal, idx) => {
                  const table = getTableInfo(proposal.tableId);
                  const color = getNationalityColor(proposal.nationality);

                  return (
                    <Card key={idx} className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-12 h-12 rounded-full flex items-center justify-center ${color.bg} ${color.text} font-bold`}
                          >
                            {table?.tableNumber || "?"}
                          </div>
                          <div>
                            <p className="font-medium">
                              Stůl {table?.tableNumber}
                            </p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <NationalityBadge nationality={proposal.nationality} size="sm" showName />
                              <span>•</span>
                              <span>{proposal.guestIds.length} hostů</span>
                              <span>•</span>
                              <span>{Math.round(proposal.fillRate * 100)}% kapacity</span>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeProposal(idx)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          )}

          {/* Unassigned */}
          {unassigned.length > 0 && (
            <Card className="border-orange-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-orange-600">
                  Nelze přiřadit ({unassigned.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1">
                  {unassigned.map((guest) => (
                    <Badge key={guest.id} variant="outline">
                      {guest.firstName || "Host"} ({guest.nationality || "?"})
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Apply button */}
          {proposals.length > 0 && (
            <Button
              className="w-full"
              onClick={() => applyMutation.mutate()}
              disabled={applyMutation.isPending}
            >
              {applyMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Aplikovat rozsazení
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
