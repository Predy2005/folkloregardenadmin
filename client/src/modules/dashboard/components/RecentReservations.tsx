import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Calendar } from 'lucide-react';
import type { Reservation } from '@shared/types';
import dayjs from 'dayjs';
import { StatusBadge } from '@/shared/components/StatusBadge';
import { Link } from 'wouter';

interface RecentReservationsProps {
  reservations: Reservation[];
}

export function RecentReservations({ reservations }: RecentReservationsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif">Poslední rezervace</CardTitle>
        <CardDescription>Nejnovější rezervace v systému</CardDescription>
      </CardHeader>
      <CardContent>
        {reservations.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Žádné rezervace
          </p>
        ) : (
          <div className="space-y-3">
            {reservations.map((reservation) => (
              <Link
                key={reservation.id}
                href={`/reservations/${reservation.id}/edit`}
              >
                <div
                  className="flex items-center gap-4 p-4 rounded-lg border border-border hover-elevate cursor-pointer transition-all"
                  data-testid={`reservation-${reservation.id}`}
                >
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {reservation.contactName}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {dayjs(reservation.date).format("DD.MM.YYYY HH:mm")} •{" "}
                      {reservation.contactEmail}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-medium">
                        {reservation.persons?.length || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        osob
                      </div>
                    </div>
                    <StatusBadge
                      status={reservation.status}
                      type="reservation"
                    />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
