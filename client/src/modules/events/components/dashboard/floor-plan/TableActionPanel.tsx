import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRightLeft, UserPlus, ArrowUpCircle, ArrowDownCircle, Utensils, X, ArrowLeft,
  UserMinus, Users2, LogOut,
} from "lucide-react";
import { api } from "@/shared/lib/api";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import { Separator } from "@/shared/components/ui/separator";
import { useToast } from "@/shared/hooks/use-toast";
import { formatCurrency } from "@/shared/lib/formatting";
import type { EventTable, EventGuest, Building, Room } from "@shared/types";
import { PosDialog } from "../expense/PosDialog";
import { MoveGuestSheet } from "./MoveGuestSheet";
import { FloorPlanSidebar } from "../../floor-plan/canvas/FloorPlanSidebar";

interface TableMovement {
  id: number;
  movementType: "INCOME" | "EXPENSE";
  category: string | null;
  amount: number;
  currency: string;
  description: string | null;
  paymentMethod: string | null;
  createdAt: string;
}

// Extended guest type with menuName (returned by /api/events/{id}/guests)
type GuestWithMenu = EventGuest & { menuName?: string | null };

interface TableActionPanelProps {
  onClose: () => void;
  table: EventTable;
  guests: GuestWithMenu[];
  allTables: EventTable[];
  allRooms: Room[];
  buildings: Building[];
  eventId: number;
  selectedRoom?: Room | null;
  onAssignGuest: (guestId: number, tableId: number) => void;
  onUnassignGuest: (guestId: number) => void;
  onAutoSeatGuests: (guestIds: number[]) => void;
}

/**
 * Non-modal side panel for table actions.
 * Designed to sit next to the floor plan canvas — the canvas remains fully visible and interactive.
 */
export function TableActionPanel({
  onClose, table, guests, allTables, allRooms, buildings, eventId,
  selectedRoom, onAssignGuest, onUnassignGuest, onAutoSeatGuests,
}: TableActionPanelProps) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [posOpen, setPosOpen] = useState<{ type: "expense" | "income" } | null>(null);
  const [seatMode, setSeatMode] = useState(false);
  // Move sheet — unified for both guest moves and movement moves.
  // Distinguished by `mode` so we know what to do on confirm.
  const [moveSheet, setMoveSheet] = useState<
    | null
    | { mode: "single"; guestId: number }
    | { mode: "all" }
    | { mode: "movement"; movementId: number; label: string }
    | { mode: "movements-all" }
  >(null);

  const assignGuest = useMutation({
    mutationFn: (data: { guestId: number; targetTableId: number }) =>
      api.post(`/api/events/${eventId}/reassign-guest`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["event-guests", eventId] });
      qc.invalidateQueries({ queryKey: ["floor-plan", eventId] });
    },
    onError: () => toast({ title: "Chyba pri usazovani", variant: "destructive" }),
  });

  // Movements linked to this table
  const { data: movements = [] } = useQuery<TableMovement[]>({
    queryKey: ["table-movements", eventId, table.id],
    queryFn: () => api.get(`/api/events/${eventId}/tables/${table.id}/movements`),
  });

  const tableIncome = movements.filter((m) => m.movementType === "INCOME").reduce((s, m) => s + m.amount, 0);
  const tableExpense = movements.filter((m) => m.movementType === "EXPENSE").reduce((s, m) => s + m.amount, 0);

  const tableGuests = guests.filter((g) => g.eventTableId === table.id);
  const unassignedGuests = guests.filter((g) => !g.eventTableId);
  const availableSeats = table.capacity - tableGuests.length;

  // ── Cache helpers for optimistic updates ───────────────────────────────
  type GuestCache = GuestWithMenu[];

  /** Patch every guest at `sourceTableId` to point to `newTableId` (null = unseat). */
  const patchGuestsCache = (sourceTableId: number, newTableId: number | null) => {
    const key = ["event-guests", eventId];
    qc.setQueryData<GuestCache>(key, (old) =>
      (old ?? []).map((g) => (g.eventTableId === sourceTableId
        ? { ...g, eventTableId: newTableId ?? undefined }
        : g
      ))
    );
  };

  /** Move all movements from source to target cache (optimistic). */
  const patchMovementsMoveAll = (sourceTableId: number, targetTableId: number) => {
    const srcKey = ["table-movements", eventId, sourceTableId];
    const tgtKey = ["table-movements", eventId, targetTableId];
    const src = qc.getQueryData<TableMovement[]>(srcKey) ?? [];
    qc.setQueryData<TableMovement[]>(srcKey, []);
    qc.setQueryData<TableMovement[]>(tgtKey, (old) => [...(old ?? []), ...src]);
  };

  /** Remove a single movement from source cache and push it to target cache. */
  const patchMovementMoveOne = (movementId: number, targetTableId: number) => {
    const srcKey = ["table-movements", eventId, table.id];
    const tgtKey = ["table-movements", eventId, targetTableId];
    const src = qc.getQueryData<TableMovement[]>(srcKey) ?? [];
    const m = src.find((x) => x.id === movementId);
    if (!m) return;
    qc.setQueryData<TableMovement[]>(srcKey, src.filter((x) => x.id !== movementId));
    qc.setQueryData<TableMovement[]>(tgtKey, (old) => [m, ...(old ?? [])]);
  };

  // ── Bulk table ops ─────────────────────────────────────────────────────
  // All bulk mutations do optimistic patches of every affected cache upfront,
  // then invalidate on settle so any backend-side corrections reconcile.
  const moveAllMutation = useMutation({
    mutationFn: (vars: { targetTableId: number; includeMovements: boolean }) =>
      api.post(`/api/events/${eventId}/tables/${table.id}/move-to/${vars.targetTableId}`, {
        includeMovements: vars.includeMovements,
      }),
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: ["event-guests", eventId] });
      const prevGuests = qc.getQueryData<GuestCache>(["event-guests", eventId]);
      const prevSrcMov = qc.getQueryData<TableMovement[]>(["table-movements", eventId, table.id]);
      const prevTgtMov = qc.getQueryData<TableMovement[]>(["table-movements", eventId, vars.targetTableId]);
      patchGuestsCache(table.id, vars.targetTableId);
      if (vars.includeMovements) patchMovementsMoveAll(table.id, vars.targetTableId);
      return { prevGuests, prevSrcMov, prevTgtMov };
    },
    onError: (_err, vars, ctx) => {
      if (ctx?.prevGuests) qc.setQueryData(["event-guests", eventId], ctx.prevGuests);
      if (ctx?.prevSrcMov) qc.setQueryData(["table-movements", eventId, table.id], ctx.prevSrcMov);
      if (ctx?.prevTgtMov) qc.setQueryData(["table-movements", eventId, vars.targetTableId], ctx.prevTgtMov);
      toast({ title: "Chyba pri presunu stolu", variant: "destructive" });
    },
    onSuccess: (res: { movedCount?: number; movedMovements?: number; toTableId?: number }) => {
      const parts = [`Presunuto ${res?.movedCount ?? tableGuests.length} hostu`];
      if (res?.movedMovements && res.movedMovements > 0) parts.push(`${res.movedMovements} transakci`);
      toast({ title: parts.join(" + ") });
      setMoveSheet(null);
    },
    onSettled: (_res, _err, vars) => {
      qc.invalidateQueries({ queryKey: ["event-guests", eventId] });
      qc.invalidateQueries({ queryKey: ["floor-plan", eventId] });
      qc.invalidateQueries({ queryKey: ["table-movements", eventId, table.id] });
      qc.invalidateQueries({ queryKey: ["table-movements", eventId, vars.targetTableId] });
      qc.invalidateQueries({ queryKey: ["table-movements-summary", eventId] });
    },
  });

  // ── Movement relink (single) ───────────────────────────────────────────
  const relinkMovementMutation = useMutation({
    mutationFn: (vars: { movementId: number; targetTableId: number }) =>
      api.post(`/api/events/${eventId}/movements/${vars.movementId}/relink-table`, {
        eventTableId: vars.targetTableId,
      }),
    onMutate: async (vars) => {
      const prevSrc = qc.getQueryData<TableMovement[]>(["table-movements", eventId, table.id]);
      const prevTgt = qc.getQueryData<TableMovement[]>(["table-movements", eventId, vars.targetTableId]);
      patchMovementMoveOne(vars.movementId, vars.targetTableId);
      return { prevSrc, prevTgt };
    },
    onError: (_err, vars, ctx) => {
      if (ctx?.prevSrc) qc.setQueryData(["table-movements", eventId, table.id], ctx.prevSrc);
      if (ctx?.prevTgt) qc.setQueryData(["table-movements", eventId, vars.targetTableId], ctx.prevTgt);
      toast({ title: "Chyba pri presunu transakce", variant: "destructive" });
    },
    onSuccess: () => {
      toast({ title: "Transakce presunuta" });
      setMoveSheet(null);
    },
    onSettled: (_res, _err, vars) => {
      qc.invalidateQueries({ queryKey: ["table-movements", eventId, table.id] });
      qc.invalidateQueries({ queryKey: ["table-movements", eventId, vars.targetTableId] });
      qc.invalidateQueries({ queryKey: ["table-movements-summary", eventId] });
    },
  });

  // ── Movement move (all movements on this table) ────────────────────────
  const moveAllMovementsMutation = useMutation({
    mutationFn: (targetTableId: number) =>
      api.post(`/api/events/${eventId}/tables/${table.id}/movements/move-to/${targetTableId}`),
    onMutate: async (targetTableId) => {
      const prevSrc = qc.getQueryData<TableMovement[]>(["table-movements", eventId, table.id]);
      const prevTgt = qc.getQueryData<TableMovement[]>(["table-movements", eventId, targetTableId]);
      patchMovementsMoveAll(table.id, targetTableId);
      return { prevSrc, prevTgt };
    },
    onError: (_err, targetTableId, ctx) => {
      if (ctx?.prevSrc) qc.setQueryData(["table-movements", eventId, table.id], ctx.prevSrc);
      if (ctx?.prevTgt) qc.setQueryData(["table-movements", eventId, targetTableId], ctx.prevTgt);
      toast({ title: "Chyba pri presunu transakci", variant: "destructive" });
    },
    onSuccess: (res: { movedCount?: number }) => {
      toast({ title: `Presunuto ${res?.movedCount ?? 0} transakci` });
      setMoveSheet(null);
    },
    onSettled: (_res, _err, targetTableId) => {
      qc.invalidateQueries({ queryKey: ["table-movements", eventId, table.id] });
      qc.invalidateQueries({ queryKey: ["table-movements", eventId, targetTableId] });
      qc.invalidateQueries({ queryKey: ["table-movements-summary", eventId] });
    },
  });

  const unseatAllMutation = useMutation({
    mutationFn: () => api.post(`/api/events/${eventId}/tables/${table.id}/unseat-all`),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ["event-guests", eventId] });
      const prevGuests = qc.getQueryData<GuestCache>(["event-guests", eventId]);
      patchGuestsCache(table.id, null);
      return { prevGuests };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prevGuests) qc.setQueryData(["event-guests", eventId], ctx.prevGuests);
      toast({ title: "Chyba pri uvolnovani stolu", variant: "destructive" });
    },
    onSuccess: (res: { unseatedCount?: number }) => {
      toast({ title: `Odebrano ${res?.unseatedCount ?? tableGuests.length} hostu` });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["event-guests", eventId] });
      qc.invalidateQueries({ queryKey: ["floor-plan", eventId] });
    },
  });

  const handleMoveConfirm = (targetTableId: number, extraChecked?: boolean) => {
    if (!moveSheet) return;
    switch (moveSheet.mode) {
      case "single":
        assignGuest.mutate(
          { guestId: moveSheet.guestId, targetTableId },
          { onSuccess: () => { toast({ title: "Host presunut" }); setMoveSheet(null); } }
        );
        break;
      case "all":
        moveAllMutation.mutate({ targetTableId, includeMovements: extraChecked === true });
        break;
      case "movement":
        relinkMovementMutation.mutate({ movementId: moveSheet.movementId, targetTableId });
        break;
      case "movements-all":
        moveAllMovementsMutation.mutate(targetTableId);
        break;
    }
  };

  const handleUnseatAll = () => {
    if (tableGuests.length === 0) return;
    if (!confirm(`Opravdu odebrat vsechny ${tableGuests.length} hosty od tohoto stolu?`)) return;
    unseatAllMutation.mutate();
  };


  // ── Seat mode: show existing FloorPlanSidebar (reservation grouping, drag-drop, multi-select) ──
  if (seatMode) {
    return (
      <aside className="w-full sm:w-80 border-l bg-card flex flex-col flex-shrink-0">
        <div className="px-3 py-2 border-b flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-9 px-2 touch-manipulation" onClick={() => setSeatMode(false)}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Zpet
          </Button>
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span className="text-sm font-semibold truncate">
              {table.tableNumber ? `#${table.tableNumber}` : ""} {table.tableName}
            </span>
            <Badge variant="outline" className="text-xs shrink-0">
              {tableGuests.length}/{table.capacity}
            </Badge>
          </div>
        </div>
        {/* Reuse the canonical sidebar — same UX as the editor:
            reservation/nationality grouping, icons (child/driver/guide), multi-select, drag-drop, auto-seat */}
        <div className="flex-1 min-h-0 flex">
          <FloorPlanSidebar
            guests={guests}
            tables={allTables}
            selectedTableId={table.id}
            room={selectedRoom}
            onAssignGuest={onAssignGuest}
            onUnassignGuest={onUnassignGuest}
            onAutoSeatGuests={onAutoSeatGuests}
          />
        </div>
      </aside>
    );
  }

  return (
    <>
      <aside className="w-full sm:w-[380px] border-l bg-card flex flex-col flex-shrink-0">
        {/* Header */}
        <div className="px-4 py-3 border-b flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-bold text-lg truncate">
              {table.tableNumber ? `#${table.tableNumber} ` : ""}{table.tableName}
            </span>
            <Badge variant="outline" className="text-xs shrink-0">
              {tableGuests.length}/{table.capacity}
            </Badge>
          </div>
          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {/* POS quick actions */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                className="h-14 bg-green-600 hover:bg-green-700 text-white text-base touch-manipulation"
                onClick={() => setPosOpen({ type: "income" })}
              >
                <ArrowUpCircle className="h-5 w-5 mr-2" />
                Prijem
              </Button>
              <Button
                className="h-14 bg-red-500 hover:bg-red-600 text-white text-base touch-manipulation"
                onClick={() => setPosOpen({ type: "expense" })}
              >
                <ArrowDownCircle className="h-5 w-5 mr-2" />
                Vydaj
              </Button>
            </div>

            <Separator />

            {/* Guests */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs uppercase text-muted-foreground font-semibold">
                  Hoste ({tableGuests.length})
                </h3>
                {availableSeats > 0 && unassignedGuests.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 touch-manipulation"
                    onClick={() => setSeatMode(true)}
                  >
                    <UserPlus className="h-3.5 w-3.5 mr-1" />
                    Posadit
                  </Button>
                )}
              </div>

              {/* Bulk actions — only visible when at least one guest is seated */}
              {tableGuests.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 touch-manipulation"
                    onClick={() => setMoveSheet({ mode: "all" })}
                    disabled={moveAllMutation.isPending}
                  >
                    <Users2 className="h-4 w-4 mr-1.5" />
                    Presadit vse
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 touch-manipulation border-amber-300 text-amber-700 hover:bg-amber-50"
                    onClick={handleUnseatAll}
                    disabled={unseatAllMutation.isPending}
                  >
                    <LogOut className="h-4 w-4 mr-1.5" />
                    Odebrat vse
                  </Button>
                </div>
              )}

              {tableGuests.length === 0 ? (
                <div className="text-center py-6 bg-muted/30 rounded-lg">
                  <p className="text-sm text-muted-foreground">Zadni hoste</p>
                  {unassignedGuests.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 touch-manipulation"
                      onClick={() => setSeatMode(true)}
                    >
                      <UserPlus className="h-4 w-4 mr-1" />
                      Posadit hosta
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {tableGuests.map((g) => (
                    <div key={g.id} className="p-2.5 rounded-lg bg-muted/50 min-h-[52px]">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {g.firstName || g.lastName
                              ? `${g.firstName ?? ""} ${g.lastName ?? ""}`.trim()
                              : `Host #${g.id}`}
                          </div>
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {g.nationality && (
                              <Badge variant="outline" className="text-[10px]">{g.nationality}</Badge>
                            )}
                            {g.type && g.type !== "adult" && (
                              <Badge variant="secondary" className="text-[10px]">
                                {g.type === "child" ? "Dite" : g.type === "infant" ? "Batole" : g.type === "driver" ? "Ridic" : g.type}
                              </Badge>
                            )}
                            {g.isPaid && (
                              <Badge className="text-[10px] bg-green-100 text-green-800">Zaplaceno</Badge>
                            )}
                            {g.isPresent && (
                              <Badge className="text-[10px] bg-blue-100 text-blue-800">Pritomen</Badge>
                            )}
                          </div>
                          {g.menuName && (
                            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                              <Utensils className="h-3 w-3 shrink-0" />
                              <span className="truncate">{g.menuName}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 px-2 touch-manipulation"
                            onClick={() => setMoveSheet({ mode: "single", guestId: g.id })}
                            title="Presadit na jiny stul"
                          >
                            <ArrowRightLeft className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 px-2 touch-manipulation text-amber-700 hover:bg-amber-50"
                            onClick={() => onUnassignGuest(g.id)}
                            title="Odebrat od stolu (do neusazenych)"
                          >
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Movements linked to this table */}
            {movements.length > 0 && (
              <>
                <Separator />
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs uppercase text-muted-foreground font-semibold">
                      Transakce u stolu ({movements.length})
                    </h3>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1 text-xs">
                        {tableIncome > 0 && (
                          <span className="text-green-600 font-medium">
                            +{formatCurrency(tableIncome, movements[0]?.currency || "CZK")}
                          </span>
                        )}
                        {tableExpense > 0 && (
                          <span className="text-red-600 font-medium">
                            -{formatCurrency(tableExpense, movements[0]?.currency || "CZK")}
                          </span>
                        )}
                      </div>
                      {movements.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs touch-manipulation"
                          onClick={() => setMoveSheet({ mode: "movements-all" })}
                          title="Presunout vsechny transakce k jinemu stolu"
                          disabled={moveAllMovementsMutation.isPending}
                        >
                          <ArrowRightLeft className="h-3 w-3 mr-1" />
                          Presunout vse
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1">
                    {movements.map((m) => {
                      const isIncome = m.movementType === "INCOME";
                      return (
                        <div
                          key={m.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-muted/40 text-sm"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              {isIncome
                                ? <ArrowUpCircle className="h-3.5 w-3.5 text-green-600 shrink-0" />
                                : <ArrowDownCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                              }
                              <span className="font-medium truncate">
                                {m.description || m.category || (isIncome ? "Prijem" : "Vydaj")}
                              </span>
                            </div>
                            {m.category && (
                              <div className="text-[11px] text-muted-foreground truncate ml-5">
                                {m.category}
                                {" - "}
                                {new Date(m.createdAt).toLocaleTimeString("cs-CZ", {
                                  hour: "2-digit", minute: "2-digit",
                                })}
                              </div>
                            )}
                          </div>
                          <span
                            className={`font-semibold tabular-nums shrink-0 ml-2 ${
                              isIncome ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            {isIncome ? "+" : "-"}{formatCurrency(m.amount, m.currency)}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 shrink-0 ml-1 touch-manipulation"
                            title="Presunout transakci k jinemu stolu"
                            onClick={() => setMoveSheet({
                              mode: "movement",
                              movementId: m.id,
                              label: m.description || m.category || (isIncome ? "Prijem" : "Vydaj"),
                            })}
                          >
                            <ArrowRightLeft className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </aside>

      {/* POS dialog - reuses existing event-level POS with categories + numpad.
          Passes eventTableId so the movement is also linked to this table. */}
      {posOpen && (
        <PosDialog
          open={!!posOpen}
          onOpenChange={(open) => { if (!open) setPosOpen(null); }}
          type={posOpen.type}
          eventId={eventId}
          eventTableId={table.id}
          contextLabel={table.tableNumber ? `#${table.tableNumber}` : table.tableName}
        />
      )}

      <MoveGuestSheet
        isOpen={!!moveSheet}
        onClose={() => setMoveSheet(null)}
        onConfirm={handleMoveConfirm}
        currentTableId={table.id}
        allTables={allTables}
        allRooms={allRooms}
        buildings={buildings}
        guests={guests}
        isPending={
          assignGuest.isPending
          || moveAllMutation.isPending
          || relinkMovementMutation.isPending
          || moveAllMovementsMutation.isPending
        }
        requiredSeats={
          moveSheet?.mode === "all" ? tableGuests.length
          : (moveSheet?.mode === "movement" || moveSheet?.mode === "movements-all") ? 0
          : 1
        }
        title={
          moveSheet?.mode === "all" ? `Presadit cely stul (${tableGuests.length} hostu)`
          : moveSheet?.mode === "movement" ? `Presunout transakci: ${moveSheet.label}`
          : moveSheet?.mode === "movements-all" ? `Presunout vsechny transakce (${movements.length})`
          : undefined
        }
        extraOption={
          moveSheet?.mode === "all" && movements.length > 0
            ? { label: `Presunout i transakce u stolu (${movements.length})`, defaultChecked: true }
            : undefined
        }
      />

    </>
  );
}
