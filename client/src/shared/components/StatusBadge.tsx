import { Badge } from '@/shared/components/ui/badge';
import type { Reservation, Payment, InvoiceStatus } from '@shared/types';
import { RESERVATION_STATUS_LABELS, PAYMENT_STATUS_LABELS, INVOICE_STATUS_LABELS } from '@shared/types';

interface StatusBadgeProps {
  status: Reservation['status'] | Payment['status'] | InvoiceStatus;
  type: 'reservation' | 'payment' | 'invoice';
}

export function StatusBadge({ status, type }: StatusBadgeProps) {
  const _getVariant = () => {
    if (status === 'PAID' || status === 'CONFIRMED') {
      return 'default'; // Zelená
    }
    if (status === 'WAITING_PAYMENT' || status === 'PENDING' || status === 'AUTHORIZED' || status === 'SENT') {
      return 'secondary'; // Žlutá/oranžová
    }
    if (status === 'CANCELLED') {
      return 'destructive'; // Červená
    }
    if (status === 'DRAFT') {
      return 'outline'; // Šedá
    }
    return 'outline'; // Default
  };

  const getLabel = () => {
    if (type === 'reservation') {
      return RESERVATION_STATUS_LABELS[status as Reservation['status']];
    }
    if (type === 'invoice') {
      return INVOICE_STATUS_LABELS[status as InvoiceStatus];
    }
    return PAYMENT_STATUS_LABELS[status as Payment['status']];
  };

  const getColorClasses = () => {
    if (status === 'PAID' || status === 'CONFIRMED') {
      return 'bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30';
    }
    if (status === 'WAITING_PAYMENT' || status === 'PENDING') {
      return 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30';
    }
    if (status === 'AUTHORIZED' || status === 'SENT') {
      return 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30';
    }
    if (status === 'CANCELLED') {
      return 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30';
    }
    if (status === 'DRAFT') {
      return 'bg-gray-500/15 text-gray-600 dark:text-gray-400 border-gray-500/30';
    }
    return 'bg-muted text-muted-foreground';
  };

  return (
    <Badge
      variant="outline"
      className={`${getColorClasses()} font-medium`}
      data-testid={`badge-status-${status.toLowerCase()}`}
    >
      {getLabel()}
    </Badge>
  );
}
