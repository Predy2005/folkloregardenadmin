import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';
import { Calendar, CreditCard, Users, Baby } from 'lucide-react';
import type { Reservation } from '@shared/types';
import dayjs from 'dayjs';
import { PageHeader } from "@/shared/components/PageHeader";
import { formatCurrency } from '@/shared/lib/formatting';
import { DashboardStats } from '../components/DashboardStats';
import { DashboardCharts } from '../components/DashboardCharts';
import { RecentReservations } from '../components/RecentReservations';

export default function Dashboard() {
  const { data: reservations, isLoading: loadingReservations } = useQuery({
    queryKey: ['/api/reservations'],
    queryFn: () => api.get<Reservation[]>('/api/reservations'),
  });

  const { data: payments, isLoading: loadingPayments } = useQuery({
    queryKey: ['/api/payment/list'],
    queryFn: () => api.get<PaymentListItem[]>('/api/payment/list'),
  });

  interface PaymentListItem { status: string; amount?: number; paidAt?: string }

  // Základní statistiky
  const totalReservations = reservations?.length || 0;
  const futureReservations = reservations?.filter((r) => dayjs(r.date).isAfter(dayjs())).length || 0;
  const pastReservations = totalReservations - futureReservations;

  const totalRevenue = payments?.reduce((sum: number, p: PaymentListItem) => {
    if (p.status === 'PAID') {
      return sum + (p.amount || 0);
    }
    return sum;
  }, 0) || 0;
  const avgRevenuePerReservation = totalReservations > 0 ? totalRevenue / totalReservations : 0;

  // Počet hostů
  const totalGuests = reservations?.reduce((sum, r) => sum + (r.persons?.length || 0), 0) || 0;
  const avgGuestsPerReservation = totalReservations > 0 ? totalGuests / totalReservations : 0;

  // Skladba hostů (adults/children)
  const adultGuests = reservations?.reduce((sum, r) => {
    return sum + (r.persons?.filter((p) => p.type === 'adult').length || 0);
  }, 0) || 0;
  const childGuests3to12 = reservations?.reduce((sum, r) => {
    return sum + (r.persons?.filter((p) => p.type === 'child').length || 0);
  }, 0) || 0;
  const childGuests0to2 = reservations?.reduce((sum, r) => {
    return sum + (r.persons?.filter((p) => p.type === 'infant').length || 0);
  }, 0) || 0;

  // Data pro grafy - počet rezervací podle měsíců
  interface MonthlyCount { month: string; count: number }
  interface MonthlyAmount { month: string; amount: number }
  interface StatusCount { status: string; count: number }

  const monthlyReservationsData = (reservations ?? []).reduce((acc: MonthlyCount[], r) => {
    const month = dayjs(r.date).format('MM.YYYY');
    const existing = acc.find((item) => item.month === month);
    if (existing) {
      existing.count += 1;
    } else {
      acc.push({ month, count: 1 });
    }
    return acc;
  }, []).sort((a, b) => {
    const [aMonth, aYear] = a.month.split('.').map(Number);
    const [bMonth, bYear] = b.month.split('.').map(Number);
    return aYear - bYear || aMonth - bMonth;
  }).slice(-12);

  // Data pro grafy - příjmy podle měsíců
  const monthlyRevenueData = (payments ?? []).reduce((acc: MonthlyAmount[], p) => {
    if (p.status === 'PAID' && p.paidAt) {
      const month = dayjs(p.paidAt).format('MM.YYYY');
      const existing = acc.find((item) => item.month === month);
      if (existing) {
        existing.amount += p.amount || 0;
      } else {
        acc.push({ month, amount: p.amount || 0 });
      }
    }
    return acc;
  }, []).sort((a, b) => {
    const [aMonth, aYear] = a.month.split('.').map(Number);
    const [bMonth, bYear] = b.month.split('.').map(Number);
    return aYear - bYear || aMonth - bMonth;
  }).slice(-12);

  // Stavy rezervací
  const statusData = (reservations ?? []).reduce((acc: StatusCount[], r) => {
    const existing = acc.find((item) => item.status === r.status);
    if (existing) {
      existing.count += 1;
    } else {
      acc.push({ status: r.status, count: 1 });
    }
    return acc;
  }, []);

  const statusLabels: Record<string, string> = {
    CONFIRMED: 'Potvrzené',
    PAID: 'Zaplacené',
    CANCELLED: 'Zrušené',
    WAITING_PAYMENT: 'Čeká na platbu',
    RECEIVED: 'Přijaté',
  };

  const statusDataForChart = statusData.map((item) => ({
    name: statusLabels[item.status] || item.status,
    value: item.count,
    percentage: ((item.count / totalReservations) * 100).toFixed(0),
  }));

  const recentReservations = reservations
    ?.sort((a, b) => dayjs(b.createdAt || b.date).diff(dayjs(a.createdAt || a.date)))
    .slice(0, 5) || [];

  // Budoucí rezervace seskupené dle dnů (počet rezervací na konkrétní datum)
  const futureReservationsByDay = Object.values(
    (reservations ?? [])
      .filter((r) => dayjs(r.date).isAfter(dayjs()))
      .reduce((acc, r) => {
        const key = dayjs(r.date).format('YYYY-MM-DD');
        if (!acc[key]) {
          acc[key] = { date: key, label: dayjs(r.date).format('DD.MM.YYYY'), count: 0 };
        }
        acc[key].count += 1;
        return acc;
      }, {} as Record<string, { date: string; label: string; count: number }>)
  ).sort((a, b) => (b.count - a.count) || a.date.localeCompare(b.date));

  const topDay = futureReservationsByDay[0];

  const stats = [
    {
      title: 'Celkem rezervací',
      value: totalReservations,
      subtitle: `${futureReservations} budoucích, ${pastReservations} minulých`,
      icon: Calendar,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Celkové příjmy',
      value: `${formatCurrency(totalRevenue)}`,
      subtitle: `Průměrně ${formatCurrency(avgRevenuePerReservation)} na rezervaci`,
      icon: CreditCard,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      title: 'Celkem hostů',
      value: totalGuests,
      subtitle: `Průměrně ${avgGuestsPerReservation.toFixed(1)} na rezervaci`,
      icon: Users,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'Skladba hostů',
      value: adultGuests,
      subtitle: `Dospělých, ${childGuests3to12} dětí 3-12 let, ${childGuests0to2} dětí 0-2 roky`,
      icon: Baby,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
    },
    {
      title: 'Rezervace dle dnů',
      value: topDay ? `${topDay.count} na ${topDay.label}` : '—',
      subtitle: `Nejvíce rezervací v jednom dni (budoucí)`,
      icon: Calendar,
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
      <PageHeader title="Statistiky" description="Přehled rezervací, příjmů a obsazenosti" />

      <DashboardStats stats={stats} />

      <DashboardCharts
        monthlyReservationsData={monthlyReservationsData}
        monthlyRevenueData={monthlyRevenueData}
        statusDataForChart={statusDataForChart}
        adultGuests={adultGuests}
        childGuests3to12={childGuests3to12}
        childGuests0to2={childGuests0to2}
        futureReservationsByDay={futureReservationsByDay}
      />

      <RecentReservations reservations={recentReservations} />
    </div>
  );
}
