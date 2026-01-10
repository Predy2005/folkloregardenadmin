import { ArrowLeft, RefreshCw, Edit, Users, Clock, MapPin } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import type { DashboardEvent, QuickStats } from "@shared/types";

interface DashboardHeaderProps {
  event: DashboardEvent;
  stats: QuickStats;
  onRefresh: () => void;
  lastUpdated: number;
  onBack: () => void;
  onEditDetail: () => void;
}

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "Návrh", className: "bg-gray-500" },
  PLANNED: { label: "Naplánováno", className: "bg-blue-500" },
  CONFIRMED: { label: "Potvrzeno", className: "bg-green-500" },
  IN_PROGRESS: { label: "Probíhá", className: "bg-orange-500" },
  COMPLETED: { label: "Dokončeno", className: "bg-purple-500" },
  CANCELLED: { label: "Zrušeno", className: "bg-red-500" },
};

export function DashboardHeader({
  event,
  stats,
  onRefresh,
  lastUpdated,
  onBack,
  onEditDetail,
}: DashboardHeaderProps) {
  const statusInfo = STATUS_LABELS[event.status] || STATUS_LABELS.DRAFT;
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

      {/* Quick Stats Bar */}
      <div className="px-4 pb-4 grid grid-cols-3 gap-2">
        <QuickStatBadge
          icon={<Users className="h-4 w-4" />}
          label="Hosté"
          value={`${stats.presentGuests}/${stats.totalGuests}`}
          sublabel={`${stats.occupancyRate}%`}
        />
        <QuickStatBadge
          icon={<Clock className="h-4 w-4" />}
          label="Program"
          value={`${stats.scheduleProgress.completed}/${stats.scheduleProgress.total}`}
          sublabel={stats.scheduleProgress.currentActivity || "—"}
        />
        <QuickStatBadge
          icon={<MapPin className="h-4 w-4" />}
          label="Místo"
          value={event.venue || "—"}
          sublabel={event.eventTime}
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
  sublabel: string;
}

function QuickStatBadge({ icon, label, value, sublabel }: QuickStatBadgeProps) {
  return (
    <div className="bg-muted/50 rounded-lg p-3 text-center">
      <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="text-lg font-bold">{value}</div>
      <div className="text-xs text-muted-foreground truncate">{sublabel}</div>
    </div>
  );
}
