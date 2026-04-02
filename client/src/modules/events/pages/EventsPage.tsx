import {useState} from "react";
import {useQuery, useMutation} from "@tanstack/react-query";
import {useLocation} from "wouter";
import {queryClient} from "@/shared/lib/queryClient";
import {api} from "@/shared/lib/api";
import type {Event} from "@shared/types";
import {EVENT_STATUS_LABELS, EVENT_TYPE_LABELS, EVENT_SPACE_LABELS} from "@shared/types";
import {Button} from "@/shared/components/ui/button";
import {Input} from "@/shared/components/ui/input";
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/shared/components/ui/select";
import {Tabs, TabsList, TabsTrigger} from "@/shared/components/ui/tabs";
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@/shared/components/ui/tooltip";
import {Plus, Pencil, Trash2, Search, Calendar, CalendarDays, Eye, Gauge, Loader2, AlertTriangle} from "lucide-react";
import {Label} from "@/shared/components/ui/label";
import {Checkbox} from "@/shared/components/ui/checkbox";
import { PageHeader } from "@/shared/components/PageHeader";
import {successToast, errorToast} from "@/shared/lib/toast-helpers";
import {Badge} from "@/shared/components/ui/badge";
import {useAuth} from "@/modules/auth/contexts/AuthContext";
import dayjs from "dayjs";

export default function Events() {
    const [, setLocation] = useLocation();
    const { isSuperAdmin } = useAuth();
    const [search, setSearch] = useState("");
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [viewingEvent, setViewingEvent] = useState<Event | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [typeFilter, setTypeFilter] = useState<string>("all");
    const [timeFilter, setTimeFilter] = useState<"all" | "upcoming" | "past" | "nearest">("nearest");
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [bulkActionOpen, setBulkActionOpen] = useState(false);
    const [bulkActionType, setBulkActionType] = useState<'status' | 'eventType' | 'delete' | null>(null);
    const [bulkValue, setBulkValue] = useState("");
    const {data: events, isLoading} = useQuery<Event[]>({
        queryKey: ["/api/events"],
        queryFn: () => api.get<Event[]>(`/api/events`),
    });

    const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
    const [singleDeleteBlockers, setSingleDeleteBlockers] = useState<any[] | null>(null);

    const deleteMutation = useMutation({
        mutationFn: async ({ id, force }: { id: number; force?: boolean }) => {
            return await api.delete(`/api/events/${id}`, { data: force ? { force: true } : undefined });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ["/api/events"]});
            setPendingDeleteId(null);
            setSingleDeleteBlockers(null);
            successToast("Akce byla smazána");
        },
        onError: (error: any) => {
            const data = error?.response?.data || error?.data;
            if (data?.blockers) {
                errorToast(`Akci nelze smazat:\n${data.blockers.map((b: any) => b.message).join('\n')}`);
            } else {
                errorToast(error);
            }
        },
    });

    const filteredEvents = (() => {
        if (!events) return [];

        const now = dayjs();

        let filtered = events.filter((event) => {
            const matchesSearch = event.name.toLowerCase().includes(search.toLowerCase());
            const matchesStatus = statusFilter === "all" || event.status === statusFilter;
            const matchesType = typeFilter === "all" || event.eventType === typeFilter;
            return matchesSearch && matchesStatus && matchesType;
        });

        if (timeFilter === "upcoming") {
            filtered = filtered.filter((event) => dayjs(event.eventDate).isAfter(now, 'day') || dayjs(event.eventDate).isSame(now, 'day'));
        } else if (timeFilter === "past") {
            filtered = filtered.filter((event) => dayjs(event.eventDate).isBefore(now, 'day'));
        } else if (timeFilter === "nearest") {
            const sortedByDistance = [...filtered].sort((a, b) => {
                const distA = Math.abs(dayjs(a.eventDate).diff(now, 'day'));
                const distB = Math.abs(dayjs(b.eventDate).diff(now, 'day'));
                return distA - distB;
            });

            const pastEvents = sortedByDistance.filter((event) => dayjs(event.eventDate).isBefore(now, 'day'));
            const futureEvents = sortedByDistance.filter((event) => dayjs(event.eventDate).isAfter(now, 'day') || dayjs(event.eventDate).isSame(now, 'day'));

            const nearestPast = pastEvents.slice(0, 4).sort((a, b) => dayjs(b.eventDate).diff(dayjs(a.eventDate)));
            const nearestFuture = futureEvents.slice(0, 4).sort((a, b) => dayjs(a.eventDate).diff(dayjs(b.eventDate)));

            filtered = [...nearestFuture, ...nearestPast];
        } else {
            filtered = filtered.sort((a, b) => dayjs(b.eventDate).diff(dayjs(a.eventDate)));
        }

        if (timeFilter !== "nearest") {
            filtered = filtered.sort((a, b) => {
                if (timeFilter === "upcoming") {
                    return dayjs(a.eventDate).diff(dayjs(b.eventDate));
                } else if (timeFilter === "past") {
                    return dayjs(b.eventDate).diff(dayjs(a.eventDate));
                } else {
                    return dayjs(b.eventDate).diff(dayjs(a.eventDate));
                }
            });
        }

        return filtered;
    })();

    const toggleSelect = (id: number) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };
    const toggleSelectAll = () => {
        const allIds = filteredEvents.map(e => e.id);
        if (allIds.every(id => selectedIds.has(id))) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(allIds));
        }
    };
    const clearSelection = () => setSelectedIds(new Set());

    const bulkUpdateMutation = useMutation({
        mutationFn: async (data: { ids: number[]; updates: Record<string, any> }) => {
            return await api.put('/api/events/bulk-update', data);
        },
        onSuccess: (data: any) => {
            queryClient.invalidateQueries({ queryKey: ["/api/events"] });
            setBulkActionOpen(false);
            clearSelection();
            successToast(`Aktualizováno ${data.count} akcí`);
        },
        onError: (error: Error) => errorToast(error),
    });

    const [deleteBlockers, setDeleteBlockers] = useState<any[] | null>(null);

    const bulkDeleteMutation = useMutation({
        mutationFn: async ({ ids, force }: { ids: number[]; force?: boolean }) => {
            return await api.delete('/api/events/bulk-delete', { data: { ids, force } });
        },
        onSuccess: (data: any) => {
            queryClient.invalidateQueries({ queryKey: ["/api/events"] });
            setBulkActionOpen(false);
            clearSelection();
            setDeleteBlockers(null);
            const actionsMsg = data.actions ? '\n' + Object.entries(data.actions).map(([name, acts]: [string, any]) => `${name}: ${acts.join(', ')}`).join('\n') : '';
            successToast(`Smazáno ${data.count} akcí${actionsMsg}`);
        },
        onError: (error: any) => {
            const data = error?.response?.data || error?.data;
            if (data?.blocked) {
                setDeleteBlockers(data.blocked);
            } else {
                errorToast(error);
            }
        },
    });

    const executeBulkAction = () => {
        const ids = Array.from(selectedIds);
        if (bulkActionType === 'delete') {
            setDeleteBlockers(null);
            bulkDeleteMutation.mutate({ ids });
            return;
        }
        const updates: Record<string, any> = {};
        if (bulkActionType === 'status') updates.status = bulkValue;
        if (bulkActionType === 'eventType') updates.eventType = bulkValue;
        bulkUpdateMutation.mutate({ ids, updates });
    };

    const executeForceDelete = () => {
        const ids = Array.from(selectedIds);
        bulkDeleteMutation.mutate({ ids, force: true });
    };

    const handleEdit = (event: Event) => {
        setLocation(`/events/${event.id}/edit`);
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Opravdu chcete smazat tuto akci?")) return;
        try {
            await api.delete(`/api/events/${id}`);
            queryClient.invalidateQueries({queryKey: ["/api/events"]});
            successToast("Akce byla smazána");
        } catch (error: any) {
            const data = error?.response?.data || error?.data;
            if (data?.blockers && isSuperAdmin) {
                const msgs = data.blockers.map((b: any) => b.message).join('\n');
                if (confirm(`Akce má závislosti:\n${msgs}\n\nChcete vynutit smazání?\n(Zůstatek pokladny bude převeden do hlavní kasy)`)) {
                    deleteMutation.mutate({ id, force: true });
                }
            } else if (data?.blockers) {
                errorToast(`Akci nelze smazat:\n${data.blockers.map((b: any) => b.message).join('\n')}`);
            } else {
                errorToast(error);
            }
        }
    };

    const handleView = (event: Event) => {
        setViewingEvent(event);
        setIsViewOpen(true);
    };

    const handleDashboard = (event: Event) => {
        setLocation(`/events/${event.id}/dashboard`);
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

    const totalGuests = (event: Event) => event.guestsPaid + event.guestsFree;

    return (
        <div className="p-6 space-y-6">
            <PageHeader title="Akce" description="Plánování a správa akcí">
                <Button
                    onClick={() => setLocation("/events/new")}
                    className="bg-primary hover:bg-primary/90"
                    data-testid="button-create-event"
                >
                    <Plus className="w-4 h-4 mr-2"/>
                    Nová akce
                </Button>
            </PageHeader>

            <Card>
                <CardHeader>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <CalendarDays className="w-5 h-5"/>
                                    Akce
                                </CardTitle>
                                <CardDescription>
                                    {timeFilter === "nearest"
                                        ? "Nejbližší akce k dnešnímu datu"
                                        : `Zobrazeno: ${filteredEvents?.length || 0} z ${events?.length || 0} akcí`}
                                </CardDescription>
                            </div>
                            <div className="relative">
                                <Search
                                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
                                <Input
                                    placeholder="Hledat akci..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-10 w-64"
                                    data-testid="input-search-events"
                                />
                            </div>
                        </div>

                        <Tabs value={timeFilter} onValueChange={(value) => setTimeFilter(value as any)}
                              className="w-full">
                            <TabsList className="grid w-full grid-cols-4">
                                <TabsTrigger value="nearest" data-testid="tab-nearest">
                                    <Calendar className="w-4 h-4 mr-2"/>
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
                                    <SelectValue placeholder="Všechny typy"/>
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
                                    <SelectValue placeholder="Všechny stavy"/>
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
                        {isSuperAdmin && selectedIds.size > 0 && (
                            <div className="flex items-center gap-2 p-3 bg-primary/5 border rounded-lg">
                                <Badge variant="secondary">{selectedIds.size} vybráno</Badge>
                                <Button size="sm" variant="outline" onClick={() => { setBulkActionType('status'); setBulkValue(''); setBulkActionOpen(true); }}>
                                    Změnit status
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => { setBulkActionType('eventType'); setBulkValue(''); setBulkActionOpen(true); }}>
                                    Změnit typ
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => { setBulkActionType('delete'); setBulkValue(''); setBulkActionOpen(true); }}>
                                    Smazat
                                </Button>
                                <Button size="sm" variant="ghost" onClick={clearSelection}>
                                    Zrušit výběr
                                </Button>
                            </div>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-center py-8 text-muted-foreground">Načítání...</div>
                    ) : filteredEvents && filteredEvents.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    {isSuperAdmin && (
                                        <TableHead className="w-[40px]">
                                            <Checkbox
                                                checked={filteredEvents.length > 0 && filteredEvents.every(e => selectedIds.has(e.id))}
                                                onCheckedChange={toggleSelectAll}
                                            />
                                        </TableHead>
                                    )}
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
                                    <TableRow key={event.id} data-testid={`row-event-${event.id}`} className={selectedIds.has(event.id) ? 'bg-primary/5' : ''}>
                                        {isSuperAdmin && (
                                            <TableCell className="w-[40px]">
                                                <Checkbox
                                                    checked={selectedIds.has(event.id)}
                                                    onCheckedChange={() => toggleSelect(event.id)}
                                                />
                                            </TableCell>
                                        )}
                                        <TableCell className="font-medium" data-testid={`text-name-${event.id}`}>
                                            {event.name}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary">{EVENT_TYPE_LABELS[event.eventType]}</Badge>
                                        </TableCell>
                                        <TableCell>{dayjs(event.eventDate).format("DD.MM.YYYY")}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                {event.spaces && event.spaces.length > 0 ? (
                                                    event.spaces.map((space) => (
                                                        <Badge key={space.spaceName} variant="outline" className="text-xs">
                                                            {EVENT_SPACE_LABELS[space.spaceName]}
                                                        </Badge>
                                                    ))
                                                ) : (
                                                    <span className="text-muted-foreground text-xs">Neurčeno</span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-sm">{event.organizerPerson}</TableCell>
                                        <TableCell>
                                            <div className="text-sm">
                                                <div className="font-medium">{totalGuests(event)} celkem</div>
                                                <div className="text-muted-foreground text-xs">
                                                    {event.guestsPaid} platících / {event.guestsFree} zdarma
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={getStatusBadgeVariant(event.status)}>
                                                {EVENT_STATUS_LABELS[event.status]}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <TooltipProvider>
                                            <div className="flex items-center justify-end gap-2">
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleDashboard(event)}
                                                            data-testid={`button-dashboard-${event.id}`}
                                                        >
                                                            <Gauge className="w-4 h-4"/>
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Dashboard</TooltipContent>
                                                </Tooltip>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleView(event)}
                                                            data-testid={`button-view-${event.id}`}
                                                        >
                                                            <Eye className="w-4 h-4"/>
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Zobrazit detail</TooltipContent>
                                                </Tooltip>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleEdit(event)}
                                                            data-testid={`button-edit-${event.id}`}
                                                        >
                                                            <Pencil className="w-4 h-4"/>
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Upravit</TooltipContent>
                                                </Tooltip>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleDelete(event.id)}
                                                            data-testid={`button-delete-${event.id}`}
                                                        >
                                                            <Trash2 className="w-4 h-4"/>
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
                                    <p className="text-sm">{EVENT_TYPE_LABELS[viewingEvent.eventType]}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Datum a čas</p>
                                    <p className="text-sm">
                                        {dayjs(viewingEvent.eventDate).format("DD.MM.YYYY")} {viewingEvent.eventTime ? viewingEvent.eventTime.substring(0,5) : ""}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Organizátor</p>
                                    <p className="text-sm">{viewingEvent.organizerPerson}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Status</p>
                                    <Badge variant={getStatusBadgeVariant(viewingEvent.status)}>
                                        {EVENT_STATUS_LABELS[viewingEvent.status]}
                                    </Badge>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Organizátor</p>
                                    <p className="text-sm">{viewingEvent.organizerPerson || "Neurčeno"}</p>
                                </div>
                                {viewingEvent.coordinatorId && (
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Koordinátor</p>
                                        <p className="text-sm">ID: {viewingEvent.coordinatorId}</p>
                                    </div>
                                )}
                                <div className="col-span-2">
                                    <p className="text-sm font-medium text-muted-foreground">Prostory</p>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {viewingEvent.spaces?.map((space) => (
                                            <Badge key={space.spaceName} variant="outline">
                                                {EVENT_SPACE_LABELS[space.spaceName]}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Počet platících</p>
                                    <p className="text-sm">{viewingEvent.guestsPaid}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Počet zdarma</p>
                                    <p className="text-sm">{viewingEvent.guestsFree}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Celkem hostů</p>
                                    <p className="text-sm">{viewingEvent.guestsTotal}</p>
                                </div>
                            </div>
                            {viewingEvent.notesInternal && (
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground mb-2">Poznámky interní</p>
                                    <p className="text-sm whitespace-pre-wrap bg-muted p-3 rounded-md">
                                        {viewingEvent.notesInternal}
                                    </p>
                                </div>
                            )}
                            {viewingEvent.notesStaff && (
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground mb-2">Poznámky personalu</p>
                                    <p className="text-sm whitespace-pre-wrap bg-muted p-3 rounded-md">
                                        {viewingEvent.notesStaff}
                                    </p>
                                </div>
                            )}
                            {viewingEvent.specialRequirements && (
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground mb-2">Speciální požadavky</p>
                                    <p className="text-sm whitespace-pre-wrap bg-muted p-3 rounded-md">
                                        {viewingEvent.specialRequirements}
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

            {/* Bulk Action Dialog */}
            <Dialog open={bulkActionOpen} onOpenChange={(open) => { setBulkActionOpen(open); if (!open) setBulkValue(''); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {bulkActionType === 'delete'
                                ? `Smazat ${selectedIds.size} akcí?`
                                : `Hromadná změna (${selectedIds.size} akcí)`}
                        </DialogTitle>
                        <DialogDescription>
                            {bulkActionType === 'delete'
                                ? 'Tato akce je nevratná.'
                                : 'Vyberte novou hodnotu pro všechny označené akce.'}
                        </DialogDescription>
                    </DialogHeader>
                    {bulkActionType === 'status' && (
                        <div className="py-4">
                            <Label>Nový status</Label>
                            <Select value={bulkValue} onValueChange={setBulkValue}>
                                <SelectTrigger className="mt-1">
                                    <SelectValue placeholder="Vyberte status" />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(EVENT_STATUS_LABELS).map(([val, label]) => (
                                        <SelectItem key={val} value={val}>{label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                    {bulkActionType === 'eventType' && (
                        <div className="py-4">
                            <Label>Nový typ</Label>
                            <Select value={bulkValue} onValueChange={setBulkValue}>
                                <SelectTrigger className="mt-1">
                                    <SelectValue placeholder="Vyberte typ" />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(EVENT_TYPE_LABELS).map(([val, label]) => (
                                        <SelectItem key={val} value={val}>{label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                    {bulkActionType === 'delete' && deleteBlockers && deleteBlockers.length > 0 && (
                        <div className="space-y-2">
                            <div className="rounded-lg border border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950 p-4 space-y-2">
                                <div className="flex items-center gap-2 text-orange-700 dark:text-orange-400 font-medium text-sm">
                                    <AlertTriangle className="h-4 w-4" />
                                    Některé akce mají závislosti:
                                </div>
                                {deleteBlockers.map((b: any) => (
                                    <div key={b.eventId} className="text-sm text-orange-600 dark:text-orange-300 pl-6">
                                        <span className="font-medium">{b.eventName}</span>
                                        <ul className="list-disc pl-4 text-xs mt-1">
                                            {b.blockers.map((bl: any, i: number) => (
                                                <li key={i}>{bl.message}</li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                                <p className="text-xs text-orange-500 dark:text-orange-400 pl-6 pt-1">
                                    Vynucené smazání automaticky převede zůstatek pokladny do hlavní kasy a odstraní převody.
                                </p>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setBulkActionOpen(false); setDeleteBlockers(null); }}>Zrušit</Button>
                        {bulkActionType === 'delete' && deleteBlockers && deleteBlockers.length > 0 ? (
                            <Button
                                variant="destructive"
                                onClick={executeForceDelete}
                                disabled={bulkDeleteMutation.isPending}
                            >
                                {bulkDeleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Vynutit smazání
                            </Button>
                        ) : (
                            <Button
                                variant={bulkActionType === 'delete' ? 'destructive' : 'default'}
                                onClick={executeBulkAction}
                                disabled={bulkUpdateMutation.isPending || bulkDeleteMutation.isPending || (bulkActionType !== 'delete' && !bulkValue)}
                            >
                                {(bulkUpdateMutation.isPending || bulkDeleteMutation.isPending) && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                {bulkActionType === 'delete' ? 'Smazat' : 'Aplikovat'}
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
