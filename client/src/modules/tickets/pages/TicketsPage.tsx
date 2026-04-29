import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { PageHeader } from "@/shared/components/PageHeader";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { MultiSelectFilter } from "@/shared/components/MultiSelectFilter";
import { CreateTicketDialog } from "../dialogs/CreateTicketDialog";
import { useTickets, useTicketCounts } from "../hooks/useTickets";
import { StatusBadge, PriorityBadge, TypeBadge } from "../components/TicketBadges";
import {
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
  TICKET_TYPE_LABELS,
  type TicketPriority,
  type TicketStatus,
  type TicketType,
} from "@shared/types";
import { Plus, Search, Loader2, MessageSquare, Paperclip, AlertTriangle } from "lucide-react";
import dayjs from "dayjs";

const STATUS_OPTIONS = (Object.keys(TICKET_STATUS_LABELS) as TicketStatus[]).map((v) => ({
  value: v,
  label: TICKET_STATUS_LABELS[v],
}));
const PRIORITY_OPTIONS = (Object.keys(TICKET_PRIORITY_LABELS) as TicketPriority[]).map((v) => ({
  value: v,
  label: TICKET_PRIORITY_LABELS[v],
}));
const TYPE_OPTIONS = (Object.keys(TICKET_TYPE_LABELS) as TicketType[]).map((v) => ({
  value: v,
  label: TICKET_TYPE_LABELS[v],
}));

const DEFAULT_OPEN_STATUSES = new Set<string>(["OPEN", "IN_PROGRESS", "WAITING_FOR_INFO"]);

export default function TicketsPage() {
  const [, navigate] = useLocation();
  const [createOpen, setCreateOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set(DEFAULT_OPEN_STATUSES));
  const [priorityFilter, setPriorityFilter] = useState<Set<string>>(new Set());
  const [typeFilter, setTypeFilter] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  const filters = useMemo(() => ({
    status: statusFilter.size > 0 ? Array.from(statusFilter) as TicketStatus[] : undefined,
    priority: priorityFilter.size > 0 ? Array.from(priorityFilter) as TicketPriority[] : undefined,
    type: typeFilter.size > 0 ? Array.from(typeFilter) as TicketType[] : undefined,
    search: search.trim() || undefined,
  }), [statusFilter, priorityFilter, typeFilter, search]);

  const { data: tickets, isLoading } = useTickets(filters);
  const { data: counts } = useTicketCounts();

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Tickety / TODO"
        description={
          counts
            ? `${counts.open} otevřených · ${counts.in_progress} v práci · ${counts.waiting} čeká na info · ${counts.total} celkem`
            : "Hlášení chyb a požadavků v systému"
        }
      >
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nahlásit chybu
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Hledat v nadpisech a popisech..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <MultiSelectFilter label="Status" options={STATUS_OPTIONS} selected={statusFilter} onChange={setStatusFilter} />
            <MultiSelectFilter label="Priorita" options={PRIORITY_OPTIONS} selected={priorityFilter} onChange={setPriorityFilter} />
            <MultiSelectFilter label="Typ" options={TYPE_OPTIONS} selected={typeFilter} onChange={setTypeFilter} />
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : !tickets?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              Žádné tickety. Klikni na "Nahlásit chybu" pro vytvoření prvního.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">#</TableHead>
                    <TableHead>Nadpis</TableHead>
                    <TableHead>Typ</TableHead>
                    <TableHead>Priorita</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Modul</TableHead>
                    <TableHead className="text-right">Vytvořeno</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.map((t) => (
                    <TableRow
                      key={t.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/tickets/${t.id}`)}
                    >
                      <TableCell className="font-mono text-xs text-muted-foreground">#{t.id}</TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {t.title}
                          {t.source === "AUTO_ERROR_LOG" && (
                            <Badge variant="outline" className="text-xs gap-1 border-red-300 bg-red-50 text-red-700">
                              <AlertTriangle className="w-3 h-3" />
                              auto
                            </Badge>
                          )}
                          {t.occurrenceCount > 1 && (
                            <Badge variant="outline" className="text-xs">×{t.occurrenceCount}</Badge>
                          )}
                        </div>
                        {(t.commentCount > 0 || t.attachmentCount > 0) && (
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            {t.commentCount > 0 && <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{t.commentCount}</span>}
                            {t.attachmentCount > 0 && <span className="flex items-center gap-1"><Paperclip className="w-3 h-3" />{t.attachmentCount}</span>}
                          </div>
                        )}
                      </TableCell>
                      <TableCell><TypeBadge type={t.type} /></TableCell>
                      <TableCell><PriorityBadge priority={t.priority} /></TableCell>
                      <TableCell><StatusBadge status={t.status} /></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{t.module ?? "—"}</TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {dayjs(t.createdAt).format("DD.MM.YYYY HH:mm")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateTicketDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(t) => navigate(`/tickets/${t.id}`)}
      />
    </div>
  );
}
