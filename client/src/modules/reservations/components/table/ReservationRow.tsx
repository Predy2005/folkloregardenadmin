import dayjs from 'dayjs';
import { Button } from '@/shared/components/ui/button';
import { TableCell, TableRow } from '@/shared/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip';
import { Eye, Edit, Trash2, Mail } from 'lucide-react';
import { StatusBadge } from '@/shared/components/StatusBadge';
import type { Reservation } from '@shared/types';

type Props = {
  reservation: Reservation;
  onView: (reservation: Reservation) => void;
  onEdit: (reservation: Reservation) => void;
  onDelete: (id: number) => void;
  onSendPayment: (id: number) => void;
};

export function ReservationRow({ reservation, onView, onEdit, onDelete, onSendPayment }: Props) {
  return (
    <TableRow data-testid={`row-reservation-${reservation.id}`}>
      <TableCell className="font-mono text-xs text-muted-foreground">#{reservation.id}</TableCell>
      <TableCell>
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-muted-foreground">
            {dayjs(reservation.date).format('DD.MM.YYYY HH:mm')}
          </span>
          <span className="font-medium">{reservation.contactName}</span>
          <span className="text-sm text-muted-foreground">{reservation.contactEmail}</span>
        </div>
      </TableCell>
      <TableCell className="font-mono text-sm">{reservation.contactPhone}</TableCell>
      <TableCell className="text-center">{reservation.persons?.length || 0}</TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {reservation.contactNationality || '-'}
      </TableCell>
      <TableCell>
        {reservation.reservationType ? (
          <span
            className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: reservation.reservationType.color + '20',
              color: reservation.reservationType.color,
            }}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: reservation.reservationType.color }}
            />
            {reservation.reservationType.name}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell>
        <StatusBadge status={reservation.status} type="reservation" />
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onView(reservation)}
                data-testid={`button-view-${reservation.id}`}
              >
                <Eye className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Zobrazit detail</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onEdit(reservation)}
                data-testid={`button-edit-${reservation.id}`}
              >
                <Edit className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Upravit</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onSendPayment(reservation.id)}
                data-testid={`button-send-payment-${reservation.id}`}
              >
                <Mail className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Odeslat platební email</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => onDelete(reservation.id)}
                data-testid={`button-delete-${reservation.id}`}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Smazat</TooltipContent>
          </Tooltip>
        </div>
      </TableCell>
    </TableRow>
  );
}
