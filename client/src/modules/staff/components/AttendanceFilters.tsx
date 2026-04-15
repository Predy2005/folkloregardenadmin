import type { StaffMember, Event } from "@shared/types";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { CheckCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { SearchInput } from "@/shared/components";
import { Clock, Filter } from "lucide-react";
import dayjs from "dayjs";

interface AttendanceFiltersProps {
  search: string;
  setSearch: (val: string) => void;
  statusFilter: string;
  setStatusFilter: (val: string) => void;
  dateFrom: string;
  setDateFrom: (val: string) => void;
  dateTo: string;
  setDateTo: (val: string) => void;
  staffMemberFilter: string;
  setStaffMemberFilter: (val: string) => void;
  eventFilter: string;
  setEventFilter: (val: string) => void;
  filtersOpen: boolean;
  setFiltersOpen: (val: boolean) => void;
  activeFilterCount: number;
  totalCount: number;
  staff?: StaffMember[];
  events?: Event[];
  // Bulk action bar props
  isSuperAdmin: boolean;
  selectedIds: Set<number>;
  onBulkMarkPaid: () => void;
  onBulkDelete: () => void;
  onClearSelection: () => void;
  bulkMarkPaidPending: boolean;
  bulkDeletePending: boolean;
}

export function AttendanceFilters({
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  staffMemberFilter,
  setStaffMemberFilter,
  eventFilter,
  setEventFilter,
  filtersOpen,
  setFiltersOpen,
  activeFilterCount,
  totalCount,
  staff,
  events,
  isSuperAdmin,
  selectedIds,
  onBulkMarkPaid,
  onBulkDelete,
  onClearSelection,
  bulkMarkPaidPending,
  bulkDeletePending,
}: AttendanceFiltersProps) {
  return (
    <>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Docházka
            </CardTitle>
            <CardDescription>
              Celkem: {totalCount} záznamů
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFiltersOpen(!filtersOpen)}
              className="relative"
            >
              <Filter className="w-4 h-4 mr-2" />
              Zobrazit filtry
              {activeFilterCount > 0 && (
                <Badge variant="default" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs rounded-full">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48" data-testid="select-status-filter">
                <SelectValue placeholder="Všechny stavy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všechny stavy</SelectItem>
                <SelectItem value="unpaid">Nezaplacené</SelectItem>
                <SelectItem value="paid">Zaplacené</SelectItem>
              </SelectContent>
            </Select>
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Hledat člena..."
              className="w-64"
            />
          </div>
        </div>

        {/* Collapsible filter section */}
        {filtersOpen && (
          <div className="flex flex-wrap items-end gap-4 mt-4 pt-4 border-t">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Od</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-44"
                data-testid="input-date-from"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Do</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-44"
                data-testid="input-date-to"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Člen personálu</label>
              <Select value={staffMemberFilter} onValueChange={setStaffMemberFilter}>
                <SelectTrigger className="w-52" data-testid="select-staff-filter">
                  <SelectValue placeholder="Všichni" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Všichni</SelectItem>
                  {staff?.map((member) => (
                    <SelectItem key={member.id} value={member.id.toString()}>
                      {member.firstName} {member.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Akce</label>
              <Select value={eventFilter} onValueChange={setEventFilter}>
                <SelectTrigger className="w-52" data-testid="select-event-filter">
                  <SelectValue placeholder="Všechny" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Všechny akce</SelectItem>
                  <SelectItem value="none">Bez akce</SelectItem>
                  {events?.map((event) => (
                    <SelectItem key={event.id} value={event.id.toString()}>
                      {event.name} ({dayjs(event.eventDate).format("DD.MM.YYYY")})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDateFrom("");
                  setDateTo("");
                  setStaffMemberFilter("all");
                  setEventFilter("all");
                }}
              >
                Resetovat filtry
              </Button>
            )}
          </div>
        )}
      </CardHeader>

      {/* Bulk action bar */}
      {isSuperAdmin && selectedIds.size > 0 && (
        <div className="px-6 pb-2">
          <div className="flex items-center gap-3 p-3 bg-muted rounded-md">
            <span className="text-sm font-medium">
              Vybráno: {selectedIds.size} {selectedIds.size === 1 ? "záznam" : selectedIds.size < 5 ? "záznamy" : "záznamů"}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={onBulkMarkPaid}
              disabled={bulkMarkPaidPending}
            >
              <CheckCircle className="w-4 h-4 mr-1" />
              {bulkMarkPaidPending ? "Označování..." : "Označit jako zaplacené"}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={onBulkDelete}
              disabled={bulkDeletePending}
            >
              {bulkDeletePending ? "Mazání..." : "Smazat"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearSelection}
            >
              Zrušit výběr
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
