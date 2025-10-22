import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, CreditCard, Users, TrendingUp } from 'lucide-react';
import type { Reservation, Payment } from '@shared/types';
import dayjs from 'dayjs';
import { StatusBadge } from '@/components/StatusBadge';
import { Link } from 'wouter';

export default function Dashboard() {
  const { data: reservations, isLoading: loadingReservations } = useQuery({
    queryKey: ['/api/reservations'],
    queryFn: () => api.get<Reservation[]>('/api/reservations'),
  });

  const { data: payments, isLoading: loadingPayments } = useQuery({
    queryKey: ['/api/payment/list'],
    queryFn: () => api.get<any>('/api/payment/list'),
  });

  // Statistiky
  const totalReservations = reservations?.length || 0;
  const paidReservations = reservations?.filter((r) => r.status === 'PAID' || r.status === 'CONFIRMED').length || 0;
  const totalRevenue = payments?.reduce((sum: number, p: any) => {
    if (p.status === 'PAID') {
      return sum + (p.amount || 0);
    }
    return sum;
  }, 0) || 0;

  const recentReservations = reservations?.slice(0, 5) || [];

  const stats = [
    {
      title: 'Celkem rezervací',
      value: totalReservations,
      icon: Calendar,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Zaplacené',
      value: paidReservations,
      icon: TrendingUp,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'Celkové příjmy',
      value: `${totalRevenue.toLocaleString('cs-CZ')} Kč`,
      icon: CreditCard,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      title: 'Platby celkem',
      value: payments?.length || 0,
      icon: Users,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
    },
  ];

  if (loadingReservations || loadingPayments) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Načítání dat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Přehled klíčových metrik a statistik</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="hover-elevate">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`w-10 h-10 rounded-full ${stat.bgColor} flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-serif font-bold" data-testid={`stat-${stat.title.toLowerCase().replace(/ /g, '-')}`}>
                {stat.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Reservations */}
      <Card>
        <CardHeader>
          <CardTitle className="font-serif">Poslední rezervace</CardTitle>
        </CardHeader>
        <CardContent>
          {recentReservations.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Žádné rezervace</p>
          ) : (
            <div className="space-y-4">
              {recentReservations.map((reservation) => (
                <Link key={reservation.id} href={`/reservations/${reservation.id}`}>
                  <div className="flex items-center justify-between p-4 rounded-lg border border-border hover-elevate cursor-pointer" data-testid={`reservation-${reservation.id}`}>
                    <div className="flex-1">
                      <p className="font-medium">{reservation.contactName}</p>
                      <p className="text-sm text-muted-foreground">
                        {dayjs(reservation.date).format('DD.MM.YYYY')} • {reservation.contactEmail}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">
                          {reservation.persons?.length || 0} osob
                        </p>
                      </div>
                      <StatusBadge status={reservation.status} type="reservation" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
