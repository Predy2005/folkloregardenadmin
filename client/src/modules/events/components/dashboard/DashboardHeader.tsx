import { Link } from "wouter";
import { ArrowLeft, RefreshCw, Edit, Users, CalendarCheck, Globe, Clock, LayoutGrid, ExternalLink, UserCheck } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { FlagIcon } from "@/shared/components/FlagIcon";
import { getIsoCode } from "@/shared/lib/nationality";
import {
  EVENT_STATUS_STYLES,
  SPACE_COLORS,
  RESERVATION_COLORS,
} from "@/shared/lib/constants";
import { LayoutSwitcher } from "./layout";
import type { DashboardEvent, QuickStats, DashboardSourceReservation } from "@shared/types";

interface DashboardHeaderProps {
  event: DashboardEvent;
  stats: QuickStats;
  onRefresh: () => void;
  lastUpdated: number;
  onBack: () => void;
  onEditDetail: () => void;
}

export function DashboardHeader({
  event,
  stats,
  onRefresh,
  lastUpdated,
  onBack,
  onEditDetail,
}: DashboardHeaderProps) {
  const statusInfo = EVENT_STATUS_STYLES[event.status] || EVENT_STATUS_STYLES.DRAFT;
  const lastUpdateTime = new Date(lastUpdated).toLocaleTimeString("cs-CZ", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("cs-CZ", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div className="sticky top-0 z-10 bg-background border-b">
      {/* Top bar with navigation and actions */}
      <div className="flex items-center justify-between p-4 gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="min-w-[44px] min-h-[44px] touch-manipulation"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold truncate">{event.name}</h1>
          <p className="text-sm text-muted-foreground truncate">
            {formatDate(event.eventDate)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge className={`${statusInfo.className} text-white`}>
            {statusInfo.label}
          </Badge>
          <LayoutSwitcher />
          <Button
            variant="ghost"
            size="icon"
            onClick={onRefresh}
            className="min-w-[44px] min-h-[44px] touch-manipulation"
          >
            <RefreshCw className="h-5 w-5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={onEditDetail}
            className="min-w-[44px] min-h-[44px] touch-manipulation"
          >
            <Edit className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Quick Stats Bar - Row 1 */}
      <div className="px-4 pb-2 grid grid-cols-6 gap-2">
        <QuickStatBadge
          icon={<CalendarCheck className="h-4 w-4" />}
          label="Rezervace"
          value={String(event.reservationCount)}
          sublabelContent={<ReservationTags reservations={event.sourceReservations} />}
          accentClass="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800"
          iconClass="text-blue-600 dark:text-blue-400"
        />
        <QuickStatBadge
          icon={<Users className="h-4 w-4" />}
          label="Celkem osob"
          value={String(event.guestsTotal)}
          sublabelContent={<GuestCountTags paid={event.guestsPaid} free={event.guestsFree} />}
          accentClass="bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800"
          iconClass="text-violet-600 dark:text-violet-400"
        />
        <QuickStatBadge
          icon={<Users className="h-4 w-4" />}
          label="Pritomnost"
          value={`${stats.presentGuests}/${stats.totalGuests}`}
          sublabel={`${stats.occupancyRate}%`}
          accentClass="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800"
          iconClass="text-emerald-600 dark:text-emerald-400"
        />
        <QuickStatBadge
          icon={<Clock className="h-4 w-4" />}
          label="Čas / Prostory"
          value={event.eventTime.slice(0, 5)}
          sublabelContent={<SpaceTags spaces={event.spaces.length > 0 ? event.spaces : (event.venue ? [event.venue] : [])} />}
          accentClass="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800"
          iconClass="text-amber-600 dark:text-amber-400"
        />
        <QuickStatBadge
          icon={<Globe className="h-4 w-4" />}
          label="Narodnosti"
          value={String(Object.keys(event.nationalityBreakdown).length)}
          sublabelContent={<NationalityTags breakdown={event.nationalityBreakdown} />}
          accentClass="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800"
          iconClass="text-indigo-600 dark:text-indigo-400"
        />
        <QuickStatBadge
          icon={<UserCheck className="h-4 w-4" />}
          label="Personál"
          value={`${event.staffAssigned}/${event.staffRequired}`}
          sublabel={event.staffAssigned >= event.staffRequired ? "Kompletní" : `Chybí ${event.staffRequired - event.staffAssigned}`}
          className={event.staffAssigned >= event.staffRequired ? "bg-green-500" : "bg-red-500"}
        />
      </div>

      {/* Last update time */}
      <div className="px-4 pb-2 text-xs text-muted-foreground text-right">
        Poslední aktualizace: {lastUpdateTime}
      </div>
    </div>
  );
}

interface QuickStatBadgeProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sublabel?: string;
  sublabelContent?: React.ReactNode;
  className?: string;
  accentClass?: string;
  iconClass?: string;
}

function QuickStatBadge({ icon, label, value, sublabel, sublabelContent, className, accentClass, iconClass }: QuickStatBadgeProps) {
  // className with bg-* (like bg-green-500) = solid colored badge (staff status)
  // accentClass = subtle tinted background
  const bgClass = className || accentClass || "bg-muted/50";
  const isSolid = !!className;

  return (
    <div className={`rounded-lg p-3 text-center ${bgClass}`}>
      <div className={`flex items-center justify-center gap-1 mb-1 ${isSolid ? "text-white/80" : iconClass || "text-muted-foreground"}`}>
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className={`text-lg font-bold ${isSolid ? "text-white" : ""}`}>{value}</div>
      {sublabelContent ? (
        <div className="mt-1">{sublabelContent}</div>
      ) : (
        <div className={`text-xs truncate ${isSolid ? "text-white/70" : "text-muted-foreground"}`}>{sublabel}</div>
      )}
    </div>
  );
}

function SpaceTags({ spaces }: { spaces: string[] }) {
  if (spaces.length === 0) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  return (
    <div className="flex flex-wrap justify-center gap-1">
      {spaces.map((space, index) => (
        <span
          key={space}
          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium text-white ${SPACE_COLORS[index % SPACE_COLORS.length]}`}
        >
          <LayoutGrid className="h-2.5 w-2.5" />
          {space}
        </span>
      ))}
    </div>
  );
}

function GuestCountTags({ paid, free }: { paid: number; free: number }) {
  return (
    <div className="flex flex-wrap justify-center gap-1">
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-500 text-white">
        <span className="font-bold">{paid}</span>
        <span className="opacity-80">platících</span>
      </span>
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-500 text-white">
        <span className="font-bold">{free}</span>
        <span className="opacity-80">neplatících</span>
      </span>
    </div>
  );
}

function ReservationTags({ reservations }: { reservations: DashboardSourceReservation[] }) {
  if (reservations.length === 0) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  return (
    <div className="flex flex-wrap justify-center gap-1">
      {reservations.map((res, index) => (
        <Link
          key={res.id}
          href={`/reservations/${res.id}/edit`}
          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium text-white hover:opacity-80 transition-opacity ${RESERVATION_COLORS[index % RESERVATION_COLORS.length]}`}
        >
          <ExternalLink className="h-2.5 w-2.5" />
          {res.contactName.split(" ")[0]}
          <span className="opacity-75">({res.guestCount})</span>
        </Link>
      ))}
    </div>
  );
}

function NationalityTags({ breakdown }: { breakdown: Record<string, number> }) {
  const entries = Object.entries(breakdown);
  if (entries.length === 0) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  return (
    <div className="flex flex-wrap justify-center gap-1">
      {entries.map(([nationality, count]) => {
        const isoCode = getIsoCode(nationality);
        return (
          <span
            key={nationality}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-600 text-white"
            title={nationality}
          >
            {isoCode ? (
              <FlagIcon code={isoCode} className="h-3 w-4 rounded-sm" />
            ) : (
              <Globe className="h-2.5 w-2.5" />
            )}
            <span className="font-bold">{count}</span>
          </span>
        );
      })}
    </div>
  );
}
