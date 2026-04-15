import { useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { api } from "@/shared/lib/api";
import { queryClient } from "@/shared/lib/queryClient";
import { successToast, errorToast } from "@/shared/lib/toast-helpers";
import { useToggleSet } from "@/shared/hooks/useToggleSet";
import type { EventMenu } from "@shared/types";
import type { ReservationInfo, MenuGroup } from "../../types";
import { invalidateGuestSummary } from "../../hooks/useGuestSummary";
import { formatCurrency } from "@/shared/lib/formatting";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Badge } from "@/shared/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/shared/components/ui/collapsible";
import { ChevronDown, ChevronRight, UtensilsCrossed, ExternalLink, RefreshCw, Loader2 } from "lucide-react";

export interface MenuTabProps {
  eventId: number;
  eventType?: string;
  menu: EventMenu[];
  isLoading: boolean;
}

export default function MenuTab({ eventId, eventType, menu, isLoading }: MenuTabProps) {
  const [, setLocation] = useLocation();

  // Sync guests from reservations mutation (populates menu data)
  const syncFromReservationsMutation = useMutation({
    mutationFn: async () => {
      return await api.post(`/api/events/${eventId}/guests/from-reservations`);
    },
    onSuccess: (data: { guestsCount?: number }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      invalidateGuestSummary(eventId);
      successToast(`Synchronizováno ${data.guestsCount ?? ""} hostů z rezervací`);
    },
    onError: (error: Error) => {
      errorToast(error);
    },
  });

  // Collapsible state
  const openSections = useToggleSet<string>();

  // Fetch reservations linked to this event
  const { data: reservationsData } = useQuery<{ groups: ReservationInfo[] }>({
    queryKey: ["/api/events", eventId, "guests/by-reservation"],
    queryFn: () => api.get(`/api/events/${eventId}/guests/by-reservation`),
  });

  const reservations = reservationsData?.groups || [];

  const isWedding = eventType === "svatba";

  // Group menu items by reservation - include ALL reservations from guests
  const groupedMenu = useMemo(() => {
    const menuByReservation: Map<number, EventMenu[]> = new Map();

    menu.forEach(item => {
      if (item.reservationId) {
        if (!menuByReservation.has(item.reservationId)) {
          menuByReservation.set(item.reservationId, []);
        }
        menuByReservation.get(item.reservationId)!.push(item);
      }
    });

    const result: MenuGroup[] = [];

    // Add ALL reservations from the event (even if they have no menu items)
    for (const res of reservations) {
      const items = menuByReservation.get(res.reservationId) || [];
      result.push({
        reservationId: res.reservationId,
        contactName: res.contactName,
        items,
        totalQuantity: items.reduce((sum, i) => sum + i.quantity, 0),
        totalPrice: items.reduce((sum, i) => sum + (i.totalPrice || 0), 0),
      });
    }

    // Add any menu items that belong to reservations not in the guests list
    const knownReservationIds = new Set(reservations.map(r => r.reservationId));
    menuByReservation.forEach((items, resId) => {
      if (!knownReservationIds.has(resId)) {
        result.push({
          reservationId: resId,
          items,
          totalQuantity: items.reduce((sum: number, i: EventMenu) => sum + i.quantity, 0),
          totalPrice: items.reduce((sum: number, i: EventMenu) => sum + (i.totalPrice || 0), 0),
        });
      }
    });

    return result;
  }, [menu, reservations]);

  const toggleSection = openSections.toggle;

  // Stats
  const totalItems = menu.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = menu.reduce((sum, i) => sum + (i.totalPrice || 0), 0);

  const renderMenuTable = (items: EventMenu[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Název</TableHead>
          <TableHead className="w-20">Počet</TableHead>
          <TableHead className="w-24">Cena/ks</TableHead>
          <TableHead className="w-24">Celkem</TableHead>
          {isWedding && <TableHead className="w-24">Čas</TableHead>}
          <TableHead>Poznámky</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell className="font-medium">{item.menuName}</TableCell>
            <TableCell>{item.quantity}</TableCell>
            <TableCell>{item.pricePerUnit ? formatCurrency(item.pricePerUnit) : "-"}</TableCell>
            <TableCell className="font-medium">{item.totalPrice ? formatCurrency(item.totalPrice) : "-"}</TableCell>
            {isWedding && <TableCell>{item.servingTime || "-"}</TableCell>}
            <TableCell className="text-muted-foreground text-sm">{item.notes || "-"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with stats */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <UtensilsCrossed className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-lg">Menu</CardTitle>
          <Badge variant="secondary">{totalItems} položek</Badge>
          {totalPrice > 0 && (
            <Badge variant="outline">{formatCurrency(totalPrice)}</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">
            Menu je odvozeno z rezervací.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => syncFromReservationsMutation.mutate()}
            disabled={syncFromReservationsMutation.isPending}
          >
            {syncFromReservationsMutation.isPending ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="mr-1 h-3 w-3" />
            )}
            Synchronizovat z rezervací
          </Button>
        </div>
      </div>

      {/* Menu groups - always show all reservations as collapsible sections */}
      <div className="space-y-2">
        {groupedMenu.map((group) => {
          const sectionKey = `res-${group.reservationId}`;
          const isOpen = openSections.isOpen(sectionKey);
          const hasItems = group.items.length > 0;

          return (
            <Collapsible
              key={sectionKey}
              open={isOpen}
              onOpenChange={() => toggleSection(sectionKey)}
            >
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30 dark:hover:bg-blue-950/50 transition-colors py-3 rounded-t-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {isOpen ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                        <CardTitle className="text-base font-medium">
                          Rezervace #{group.reservationId}{group.contactName ? ` - ${group.contactName}` : ""}
                        </CardTitle>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={hasItems ? "secondary" : "outline"}>
                          {group.totalQuantity} ks
                        </Badge>
                        {group.totalPrice > 0 && (
                          <Badge variant="outline">{formatCurrency(group.totalPrice)}</Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLocation(`/reservations/${group.reservationId}/edit`);
                          }}
                        >
                          <ExternalLink className="h-3.5 w-3.5 mr-1" />
                          Upravit
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0 px-0">
                    {hasItems ? (
                      renderMenuTable(group.items)
                    ) : (
                      <div className="p-4 text-center text-muted-foreground text-sm border-t">
                        Žádná jídla v této rezervaci
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })}
      </div>

      {/* Show message when no reservations exist */}
      {groupedMenu.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center space-y-3">
            <p className="text-muted-foreground">
              Zatím nejsou žádné rezervace přiřazené k této akci.
            </p>
            <Button
              variant="outline"
              onClick={() => syncFromReservationsMutation.mutate()}
              disabled={syncFromReservationsMutation.isPending}
            >
              {syncFromReservationsMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Synchronizovat z rezervací
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
