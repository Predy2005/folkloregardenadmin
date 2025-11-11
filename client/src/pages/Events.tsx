import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { api } from "@/lib/api";
import type { Event } from "@shared/types";
import { EVENT_STATUS_LABELS, EVENT_TYPE_LABELS, EVENT_SPACE_LABELS } from "@shared/types";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, Search, Calendar, CalendarDays, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import dayjs from "dayjs";

export default function Events() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewingEvent, setViewingEvent] = useState<Event | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [timeFilter, setTimeFilter] = useState<"all" | "upcoming" | "past" | "nearest">("nearest");
  const { toast } = useToast();

  const { data: events, isLoading } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await api.delete(`/api/events/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({
        title: "Úspěch",
        description: "Akce byla smazána",
      });
    },
    onError: () => {
      toast({
        title: "Chyba",
        description: "Nepodařilo se smazat akci",
        variant: "destructive",
      });
    },
  });

  const filteredEvents = (() => {
    if (!events) return [];
    
    const now = dayjs();
    
    let filtered = events.filter((event) => {
      const matchesSearch = event.name.toLowerCase().includes(search.toLowerCase()) ||
        event.organizerName.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || event.status === statusFilter;
      const matchesType = typeFilter === "all" || event.type === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
    
    if (timeFilter === "upcoming") {
      filtered = filtered.filter((event) => dayjs(event.date).isAfter(now, 'day') || dayjs(event.date).isSame(now, 'day'));
    } else if (timeFilter === "past") {
      filtered = filtered.filter((event) => dayjs(event.date).isBefore(now, 'day'));
    } else if (timeFilter === "nearest") {
      const sortedByDistance = [...filtered].sort((a, b) => {
        const distA = Math.abs(dayjs(a.date).diff(now, 'day'));
        const distB = Math.abs(dayjs(b.date).diff(now, 'day'));
        return distA - distB;
      });
      
      const pastEvents = sortedByDistance.filter((event) => dayjs(event.date).isBefore(now, 'day'));
      const futureEvents = sortedByDistance.filter((event) => dayjs(event.date).isAfter(now, 'day') || dayjs(event.date).isSame(now, 'day'));
      
      const nearestPast = pastEvents.slice(0, 4).sort((a, b) => dayjs(b.date).diff(dayjs(a.date)));
      const nearestFuture = futureEvents.slice(0, 4).sort((a, b) => dayjs(a.date).diff(dayjs(b.date)));
      
      filtered = [...nearestFuture, ...nearestPast];
    } else {
      filtered = filtered.sort((a, b) => dayjs(b.date).diff(dayjs(a.date)));
    }
    
    if (timeFilter !== "nearest") {
      filtered = filtered.sort((a, b) => {
        if (timeFilter === "upcoming") {
          return dayjs(a.date).diff(dayjs(b.date));
        } else if (timeFilter === "past") {
          return dayjs(b.date).diff(dayjs(a.date));
        } else {
          return dayjs(b.date).diff(dayjs(a.date));
        }
      });
    }
    
    return filtered;
  })();

  const handleEdit = (event: Event) => {
    setLocation(`/events/${event.id}/edit`);
  };

  const handleDelete = (id: number) => {
    if (confirm("Opravdu chcete smazat tuto akci?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleView = (event: Event) => {
    setViewingEvent(event);
    setIsViewOpen(true);
  };

  const getStatusBadgeVariant = (status: Event['status']) => {
    switch (status) {
      case 'DRAFT':
        return 'secondary';
      case 'PLANNED':
        return 'default';
      case 'IN_PROGRESS':
        return 'default';
      case 'COMPLETED':
        return 'default';
      case 'CANCELLED':
        return 'destructive';
    }
  };

  const totalGuests = (event: Event) => event.paidCount + event.freeCount;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Akce</h1>
          <p className="text-muted-foreground">Plánování a správa akcí</p>
        </div>
        <Button
          onClick={() => setLocation("/events/new")}
          className="bg-gradient-to-r from-primary to-purple-600"
          data-testid="button-create-event"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nová akce
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="w-5 h-5" />
                  Akce
                </CardTitle>
                <CardDescription>
                  {timeFilter === "nearest" 
                    ? "Nejbližší akce k dnešnímu datu" 
                    : `Zobrazeno: ${filteredEvents?.length || 0} z ${events?.length || 0} akcí`}
                </CardDescription>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Hledat akci..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 w-64"
                  data-testid="input-search-events"
                />
              </div>
            </div>
            
            <Tabs value={timeFilter} onValueChange={(value) => setTimeFilter(value as any)} className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="nearest" data-testid="tab-nearest">
                  <Calendar className="w-4 h-4 mr-2" />
                  Nejbližší
                </TabsTrigger>
                <TabsTrigger value="upcoming" data-testid="tab-upcoming">
                  Nadcházející
                </TabsTrigger>
                <TabsTrigger value="past" data-testid="tab-past">
                  Prošlé
                </TabsTrigger>
                <TabsTrigger value="all" data-testid="tab-all">
                  Všechny
                </TabsTrigger>
              </TabsList>
            </Tabs>
            
            <div className="flex items-center gap-2">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-48" data-testid="select-type-filter">
                  <SelectValue placeholder="Všechny typy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Všechny typy</SelectItem>
                  <SelectItem value="folklorni_show">Folklorní show</SelectItem>
                  <SelectItem value="svatba">Svatba</SelectItem>
                  <SelectItem value="event">Event</SelectItem>
                  <SelectItem value="privat">Soukromá akce</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48" data-testid="select-status-filter">
                  <SelectValue placeholder="Všechny stavy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Všechny stavy</SelectItem>
                  <SelectItem value="DRAFT">Koncept</SelectItem>
                  <SelectItem value="PLANNED">Plánováno</SelectItem>
                  <SelectItem value="IN_PROGRESS">Probíhá</SelectItem>
                  <SelectItem value="COMPLETED">Dokončeno</SelectItem>
                  <SelectItem value="CANCELLED">Zrušeno</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Načítání...</div>
          ) : filteredEvents && filteredEvents.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Název</TableHead>
                  <TableHead>Typ</TableHead>
                  <TableHead>Datum</TableHead>
                  <TableHead>Prostor</TableHead>
                  <TableHead>Organizátor</TableHead>
                  <TableHead>Hosté</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Akce</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEvents.map((event) => (
                  <TableRow key={event.id} data-testid={`row-event-${event.id}`}>
                    <TableCell className="font-medium" data-testid={`text-name-${event.id}`}>
                      {event.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{EVENT_TYPE_LABELS[event.type]}</Badge>
                    </TableCell>
                    <TableCell>{dayjs(event.date).format("DD.MM.YYYY")}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {event.spaces && event.spaces.length > 0 ? (
                          event.spaces.map((space) => (
                            <Badge key={space} variant="outline" className="text-xs">
                              {EVENT_SPACE_LABELS[space]}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground text-xs">Neurčeno</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{event.organizerName}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">{totalGuests(event)} celkem</div>
                        <div className="text-muted-foreground text-xs">
                          {event.paidCount} platících / {event.freeCount} zdarma
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(event.status)}>
                        {EVENT_STATUS_LABELS[event.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleView(event)}
                          data-testid={`button-view-${event.id}`}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(event)}
                          data-testid={`button-edit-${event.id}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(event.id)}
                          data-testid={`button-delete-${event.id}`}
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
              {search || statusFilter !== "all" || typeFilter !== "all" 
                ? "Žádné akce nenalezeny" 
                : "Zatím žádné akce"}
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Event Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewingEvent?.name}</DialogTitle>
            <DialogDescription>
              Zobrazení detailu akce
            </DialogDescription>
          </DialogHeader>
          {viewingEvent && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Typ akce</p>
                  <p className="text-sm">{EVENT_TYPE_LABELS[viewingEvent.type]}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Datum</p>
                  <p className="text-sm">{dayjs(viewingEvent.date).format("DD.MM.YYYY")}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Organizátor</p>
                  <p className="text-sm">{viewingEvent.organizerName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <Badge variant={getStatusBadgeVariant(viewingEvent.status)}>
                    {EVENT_STATUS_LABELS[viewingEvent.status]}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Kontaktní osoba</p>
                  <p className="text-sm">{viewingEvent.contactPerson || "Neurčeno"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Koordinátor</p>
                  <p className="text-sm">{viewingEvent.coordinator || "Neurčeno"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">Prostory</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {viewingEvent.spaces?.map((space) => (
                      <Badge key={space} variant="outline">
                        {EVENT_SPACE_LABELS[space]}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Počet platících</p>
                  <p className="text-sm">{viewingEvent.paidCount}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Počet zdarma</p>
                  <p className="text-sm">{viewingEvent.freeCount}</p>
                </div>
              </div>
              {viewingEvent.notes && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Poznámky</p>
                  <p className="text-sm whitespace-pre-wrap bg-muted p-3 rounded-md">
                    {viewingEvent.notes}
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsViewOpen(false)} data-testid="button-close">
              Zavřít
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
