import { useLocation } from "wouter";
import { Banknote, QrCode, Plus, FileText, UtensilsCrossed } from "lucide-react";
import { Button } from "@/shared/components/ui/button";

interface QuickActionsBarProps {
  eventId: number;
  onNavigateToEdit: () => void;
}

export function QuickActionsBar({ eventId, onNavigateToEdit }: QuickActionsBarProps) {
  const [, navigate] = useLocation();

  const actions = [
    {
      icon: <Banknote className="h-5 w-5" />,
      label: "Platby",
      onClick: () => navigate(`/events/${eventId}/edit?tab=staff`),
    },
    {
      icon: <QrCode className="h-5 w-5" />,
      label: "Vouchery",
      onClick: () => navigate(`/events/${eventId}/edit?tab=vouchers`),
    },
    {
      icon: <Plus className="h-5 w-5" />,
      label: "Výdaj",
      onClick: () => {
        // This will be handled by clicking the expense button in ExpenseTrackerCard
        // For now, scroll to expense card
        const expenseCard = document.querySelector('[data-expense-card]');
        expenseCard?.scrollIntoView({ behavior: 'smooth' });
      },
    },
    {
      icon: <UtensilsCrossed className="h-5 w-5" />,
      label: "Číšník",
      onClick: () => navigate(`/events/${eventId}/waiter`),
    },
    {
      icon: <FileText className="h-5 w-5" />,
      label: "Detail",
      onClick: onNavigateToEdit,
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg z-20">
      <div className="flex items-center justify-around p-2 max-w-2xl mx-auto">
        {actions.map((action) => (
          <Button
            key={action.label}
            variant="ghost"
            className="flex flex-col items-center gap-1 min-w-[60px] min-h-[60px] touch-manipulation"
            onClick={action.onClick}
          >
            {action.icon}
            <span className="text-xs">{action.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
