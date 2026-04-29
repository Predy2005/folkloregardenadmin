import { Badge } from "@/shared/components/ui/badge";
import {
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
  TICKET_TYPE_LABELS,
  type TicketPriority,
  type TicketStatus,
  type TicketType,
} from "@shared/types";
import { Bug, Lightbulb, HelpCircle, Sparkles } from "lucide-react";

const STATUS_COLORS: Record<TicketStatus, string> = {
  OPEN: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300",
  IN_PROGRESS: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300",
  WAITING_FOR_INFO: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300",
  RESOLVED: "bg-green-100 text-green-800 border-green-200 dark:bg-green-950/40 dark:text-green-300",
  CLOSED: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300",
  WONTFIX: "bg-stone-100 text-stone-700 border-stone-300 dark:bg-stone-900 dark:text-stone-400",
};

const PRIORITY_COLORS: Record<TicketPriority, string> = {
  LOW: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300",
  NORMAL: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300",
  HIGH: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300",
  CRITICAL: "bg-red-100 text-red-800 border-red-300 dark:bg-red-950/40 dark:text-red-300",
};

const TYPE_ICONS: Record<TicketType, React.ComponentType<{ className?: string }>> = {
  BUG: Bug,
  FEATURE: Lightbulb,
  QUESTION: HelpCircle,
  IMPROVEMENT: Sparkles,
};

export function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <Badge variant="outline" className={STATUS_COLORS[status]}>
      {TICKET_STATUS_LABELS[status]}
    </Badge>
  );
}

export function PriorityBadge({ priority }: { priority: TicketPriority }) {
  return (
    <Badge variant="outline" className={PRIORITY_COLORS[priority]}>
      {TICKET_PRIORITY_LABELS[priority]}
    </Badge>
  );
}

export function TypeBadge({ type }: { type: TicketType }) {
  const Icon = TYPE_ICONS[type];
  return (
    <Badge variant="outline" className="gap-1">
      <Icon className="w-3 h-3" />
      {TICKET_TYPE_LABELS[type]}
    </Badge>
  );
}
