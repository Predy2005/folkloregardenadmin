import {useState} from "react";
import {useQuery, useMutation} from "@tanstack/react-query";
import {useLocation} from "wouter";
import {invalidateEventQueries} from "@/shared/lib/query-helpers";
import {api} from "@/shared/lib/api";
import {useBulkSelection} from "@/shared/hooks/useBulkSelection";
import type {Event} from "@shared/types";
import {EVENT_STATUS_LABELS, EVENT_TYPE_LABELS} from "@shared/types";
import {Button} from "@/shared/components/ui/button";
import {Card, CardContent} from "@/shared/components/ui/card";
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
import {Plus, Loader2, AlertTriangle} from "lucide-react";
import {Label} from "@/shared/components/ui/label";
import {PageHeader} from "@/shared/components/PageHeader";
import {successToast, errorToast} from "@/shared/lib/toast-helpers";
import {Badge} from "@/shared/components/ui/badge";
import {useAuth} from "@/modules/auth/contexts/AuthContext";
import { filterAndSortEvents } from "../utils/eventFilters";
import { EventFilters } from "../components/EventFilters";
import { EventsTable } from "../components/EventsTable";
import { EventDetailDialog } from "../components/EventDetailDialog";

interface Blocker { message: string }
interface DeleteBlockerEntry { eventId: number; eventName: string; blockers: Blocker[] }

function getAxiosErrorData(error: unknown): Record<string, unknown> | undefined {
    const err = error as { response?: { data?: Record<string, unknown> }; data?: Record<string, unknown> };
    return err?.response?.data || err?.data;
}

export default function Events() {
    const [, setLocation] = useLocation();
    const { isSuperAdmin } = useAuth();
    const [search, setSearch] = useState("");
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [viewingEvent, setViewingEvent] = useState<Event | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [typeFilter, setTypeFilter] = useState<string>("all");
    const [timeFilter, setTimeFilter] = useState<"all" | "upcoming" | "past" | "nearest">("nearest");
    const [bulkActionOpen, setBulkActionOpen] = useState(false);
    const [bulkActionType, setBulkActionType] = useState<'status' | 'eventType' | 'delete' | null>(null);
    const [bulkValue, setBulkValue] = useState("");
    const {data: events, isLoading} = useQuery<Event[]>({
        queryKey: ["/api/events"],
        queryFn: () => api.get<Event[]>(`/api/events`),
    });

    const deleteMutation = useMutation({
        mutationFn: async ({ id, force }: { id: number; force?: boolean }) => {
            return await api.delete(`/api/events/${id}`, { data: force ? { force: true } : undefined });
        },
        onSuccess: () => {
            invalidateEventQueries();
            successToast("Akce byla smazána");
        },
        onError: (error: Error) => {
            const data = getAxiosErrorData(error);
            const blockers = data?.blockers as Blocker[] | undefined;
            if (blockers) {
                errorToast(`Akci nelze smazat:\n${blockers.map((b) => b.message).join('\n')}`);
            } else {
                errorToast(error);
            }
        },
    });

    const filteredEvents = events ? filterAndSortEvents(events, search, statusFilter, typeFilter, timeFilter) : [];

    const { selectedIds, toggleSelect, toggleSelectAll, clearSelection } = useBulkSelection({
        items: filteredEvents,
        getId: (e) => e.id,
    });

    const bulkUpdateMutation = useMutation({
        mutationFn: async (data: { ids: number[]; updates: Record<string, string> }) => await api.put('/api/events/bulk-update', data),
        onSuccess: (data: { count: number }) => { invalidateEventQueries(); setBulkActionOpen(false); clearSelection(); successToast(`Aktualizováno ${data.count} akcí`); },
        onError: (error: Error) => errorToast(error),
    });

    const [deleteBlockers, setDeleteBlockers] = useState<DeleteBlockerEntry[] | null>(null);

    const bulkDeleteMutation = useMutation({
        mutationFn: async ({ ids, force }: { ids: number[]; force?: boolean }) => await api.delete('/api/events/bulk-delete', { data: { ids, force } }),
        onSuccess: (data: { count: number; actions?: Record<string, string[]> }) => {
            invalidateEventQueries(); setBulkActionOpen(false); clearSelection(); setDeleteBlockers(null);
            const actionsMsg = data.actions ? '\n' + Object.entries(data.actions).map(([name, acts]) => `${name}: ${acts.join(', ')}`).join('\n') : '';
            successToast(`Smazáno ${data.count} akcí${actionsMsg}`);
        },
        onError: (error: Error) => {
            const data = getAxiosErrorData(error);
            if (data?.blocked) setDeleteBlockers(data.blocked as DeleteBlockerEntry[]);
            else errorToast(error);
        },
    });

    const executeBulkAction = () => {
        const ids = Array.from(selectedIds);
        if (bulkActionType === 'delete') { setDeleteBlockers(null); bulkDeleteMutation.mutate({ ids }); return; }
        const updates: Record<string, string> = {};
        if (bulkActionType === 'status') updates.status = bulkValue;
        if (bulkActionType === 'eventType') updates.eventType = bulkValue;
        bulkUpdateMutation.mutate({ ids, updates });
    };

    const executeForceDelete = () => bulkDeleteMutation.mutate({ ids: Array.from(selectedIds), force: true });

    const handleDelete = async (id: number) => {
        if (!confirm("Opravdu chcete smazat tuto akci?")) return;
        try {
            await api.delete(`/api/events/${id}`);
            invalidateEventQueries();
            successToast("Akce byla smazána");
        } catch (error: unknown) {
            const data = getAxiosErrorData(error);
            const blockers = data?.blockers as Blocker[] | undefined;
            if (blockers && isSuperAdmin) {
                const msgs = blockers.map((b) => b.message).join('\n');
                if (confirm(`Akce má závislosti:\n${msgs}\n\nChcete vynutit smazání?\n(Zůstatek pokladny bude převeden do hlavní kasy)`)) {
                    deleteMutation.mutate({ id, force: true });
                }
            } else if (blockers) {
                errorToast(`Akci nelze smazat:\n${blockers.map((b) => b.message).join('\n')}`);
            } else {
                errorToast(error instanceof Error ? error : new Error("Chyba"));
            }
        }
    };

    return (
        <div className="p-6 space-y-6">
            <PageHeader title="Akce" description="Plánování a správa akcí">
                <Button onClick={() => setLocation("/events/new")} className="bg-primary hover:bg-primary/90" data-testid="button-create-event">
                    <Plus className="w-4 h-4 mr-2"/>
                    Nová akce
                </Button>
            </PageHeader>

            <Card>
                <EventFilters
                    search={search} setSearch={setSearch} timeFilter={timeFilter} setTimeFilter={setTimeFilter}
                    typeFilter={typeFilter} setTypeFilter={setTypeFilter} statusFilter={statusFilter} setStatusFilter={setStatusFilter}
                    filteredCount={filteredEvents.length} totalCount={events?.length || 0}
                    isSuperAdmin={isSuperAdmin} selectedIds={selectedIds}
                    onBulkChangeStatus={() => { setBulkActionType('status'); setBulkValue(''); setBulkActionOpen(true); }}
                    onBulkChangeType={() => { setBulkActionType('eventType'); setBulkValue(''); setBulkActionOpen(true); }}
                    onBulkDelete={() => { setBulkActionType('delete'); setBulkValue(''); setBulkActionOpen(true); }}
                    onClearSelection={clearSelection}
                />
                <CardContent>
                    <EventsTable
                        events={filteredEvents} isLoading={isLoading}
                        hasFilters={!!(search || statusFilter !== "all" || typeFilter !== "all")}
                        isSuperAdmin={isSuperAdmin} selectedIds={selectedIds}
                        onToggleSelect={toggleSelect} onToggleSelectAll={toggleSelectAll}
                        onDashboard={(event) => setLocation(`/events/${event.id}/dashboard`)}
                        onView={(event) => { setViewingEvent(event); setIsViewOpen(true); }}
                        onEdit={(event) => setLocation(`/events/${event.id}/edit`)}
                        onDelete={(id) => handleDelete(id)}
                    />
                </CardContent>
            </Card>

            <EventDetailDialog isOpen={isViewOpen} onOpenChange={setIsViewOpen} event={viewingEvent} />

            {/* Bulk Action Dialog */}
            <Dialog open={bulkActionOpen} onOpenChange={(open) => { setBulkActionOpen(open); if (!open) setBulkValue(''); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {bulkActionType === 'delete' ? `Smazat ${selectedIds.size} akcí?` : `Hromadná změna (${selectedIds.size} akcí)`}
                        </DialogTitle>
                        <DialogDescription>
                            {bulkActionType === 'delete' ? 'Tato akce je nevratná.' : 'Vyberte novou hodnotu pro všechny označené akce.'}
                        </DialogDescription>
                    </DialogHeader>
                    {bulkActionType === 'status' && (
                        <div className="py-4">
                            <Label>Nový status</Label>
                            <Select value={bulkValue} onValueChange={setBulkValue}>
                                <SelectTrigger className="mt-1"><SelectValue placeholder="Vyberte status" /></SelectTrigger>
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
                                <SelectTrigger className="mt-1"><SelectValue placeholder="Vyberte typ" /></SelectTrigger>
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
                                {deleteBlockers.map((b) => (
                                    <div key={b.eventId} className="text-sm text-orange-600 dark:text-orange-300 pl-6">
                                        <span className="font-medium">{b.eventName}</span>
                                        <ul className="list-disc pl-4 text-xs mt-1">
                                            {b.blockers.map((bl, i) => (<li key={i}>{bl.message}</li>))}
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
                            <Button variant="destructive" onClick={executeForceDelete} disabled={bulkDeleteMutation.isPending}>
                                {bulkDeleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Vynutit smazání
                            </Button>
                        ) : (
                            <Button
                                variant={bulkActionType === 'delete' ? 'destructive' : 'default'}
                                onClick={executeBulkAction}
                                disabled={bulkUpdateMutation.isPending || bulkDeleteMutation.isPending || (bulkActionType !== 'delete' && !bulkValue)}
                            >
                                {(bulkUpdateMutation.isPending || bulkDeleteMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {bulkActionType === 'delete' ? 'Smazat' : 'Aplikovat'}
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
