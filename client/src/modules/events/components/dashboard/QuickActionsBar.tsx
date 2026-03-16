import { useState } from "react";
import { useLocation } from "wouter";
import { Banknote, Plus, FileText, UserPlus, CalendarPlus } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { QuickAddGuestDialog } from "./QuickAddGuestDialog";

interface QuickActionsBarProps {
  eventId: number;
  eventDate: string;
  onNavigateToEdit: () => void;
}

export function QuickActionsBar({ eventId, eventDate, onNavigateToEdit }: QuickActionsBarProps) {
  const [, navigate] = useLocation();
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  const actions = [
    {
      icon: <UserPlus className="h-5 w-5" />,
      label: "+ Host",
      onClick: () => setQuickAddOpen(true),
      highlight: true,
    },
    {
      icon: <CalendarPlus className="h-5 w-5" />,
      label: "Rezervace",
      onClick: () => navigate(`/reservations?date=${eventDate}`),
    },
    {
      icon: <Banknote className="h-5 w-5" />,
      label: "Platby",
      onClick: () => navigate(`/events/${eventId}/edit?tab=finance`),
    },
    {
      icon: <FileText className="h-5 w-5" />,
      label: "Detail",
      onClick: onNavigateToEdit,
    },
  ];

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg z-20">
        <div className="flex items-center justify-around p-2 max-w-2xl mx-auto">
          {actions.map((action) => (
            <Button
              key={action.label}
              variant={action.highlight ? "default" : "ghost"}
              className={`flex flex-col items-center gap-1 min-w-[60px] min-h-[60px] touch-manipulation ${
                action.highlight ? "bg-primary text-primary-foreground" : ""
              }`}
              onClick={action.onClick}
            >
              {action.icon}
              <span className="text-xs">{action.label}</span>
            </Button>
          ))}
        </div>
      </div>

      <QuickAddGuestDialog
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        eventId={eventId}
        eventDate={eventDate}
      />
    </>
  );
}
