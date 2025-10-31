import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, CreditCard, Users, Baby } from 'lucide-react';
import type { Reservation } from '@shared/types';
import dayjs from 'dayjs';
import { StatusBadge } from '@/components/StatusBadge';
import { Link } from 'wouter';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const STATUS_COLORS = {
  CONFIRMED: 'hsl(210, 100%, 60%)',
  PAID: 'hsl(350, 70%, 60%)',
  CANCELLED: 'hsl(0, 70%, 60%)',
  WAITING_PAYMENT: 'hsl(45, 100%, 60%)',
  RECEIVED: 'hsl(200, 70%, 50%)',
};

export default function Dashboard() {
  const { data: reservations, isLoading: loadingReservations } = useQuery({
    queryKey: ['/api/reservations'],
    queryFn: () => api.get<Reservation[]>('/api/reservations'),
  });

  const { data: payments, isLoading: loadingPayments } = useQuery({
    queryKey: ['/api/payment/list'],
    queryFn: () => api.get<any>('/api/payment/list'),
  });

  // Základní statistiky
  const totalReservations = reservations?.length || 0;
  const futureReservations = reservations?.filter((r) => dayjs(r.date).isAfter(dayjs())).length || 0;
  const pastReservations = totalReservations - futureReservations;

  const totalRevenue = payments?.reduce((sum: number, p: any) => {
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
  const monthlyReservationsData = (reservations ?? []).reduce((acc: any[], r) => {
    const month = dayjs(r.date).format('MM.YYYY');
    const existing = acc.find((item) => item.month === month);
    if (existing) {
      existing.count += 1;
    } else {
      acc.push({ month, count: 1 });
    }
    return acc;
  }, []).sort((a: any, b: any) => {
    const [aMonth, aYear] = a.month.split('.').map(Number);
    const [bMonth, bYear] = b.month.split('.').map(Number);
    return aYear - bYear || aMonth - bMonth;
  }).slice(-12);

  // Data pro grafy - příjmy podle měsíců
  const monthlyRevenueData = (payments ?? []).reduce((acc: any[], p: any) => {
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
  }, []).sort((a: any, b: any) => {
    const [aMonth, aYear] = a.month.split('.').map(Number);
    const [bMonth, bYear] = b.month.split('.').map(Number);
    return aYear - bYear || aMonth - bMonth;
  }).slice(-12);

  // Stavy rezervací
  const statusData = (reservations ?? []).reduce((acc: any[], r) => {
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

  // Stavy rezervací podle typu (budoucí / minulé)
  const futureReservationsCount = reservations?.filter((r) => dayjs(r.date).isAfter(dayjs())).length || 0;
  const pastReservationsCount = totalReservations - futureReservationsCount;

  const recentReservations = reservations
    ?.sort((a, b) => dayjs(b.createdAt || b.date).diff(dayjs(a.createdAt || a.date)))
    .slice(0, 5) || [];

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
      value: `${totalRevenue.toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kč`,
      subtitle: `Průměrně ${avgRevenuePerReservation.toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kč na rezervaci`,
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
        <h1 className="text-3xl font-serif font-bold mb-2">Statistiky</h1>
        <p className="text-muted-foreground">Přehled rezervací, příjmů a obsazenosti</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="hover-elevate">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardDescription className="text-sm">{stat.title}</CardDescription>
                  <CardTitle className="text-3xl font-serif font-bold" data-testid={`stat-${stat.title.toLowerCase().replace(/ /g, '-')}`}>
                    {stat.value}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
                </div>
                <div className={`w-10 h-10 rounded-full ${stat.bgColor} flex items-center justify-center flex-shrink-0`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      {/* Charts Tabs */}
      <Tabs defaultValue="monthly" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="monthly">Měsíční přehledy</TabsTrigger>
          <TabsTrigger value="composition">Skladba hostů</TabsTrigger>
          <TabsTrigger value="status">Stavy rezervací</TabsTrigger>
        </TabsList>

        <TabsContent value="monthly" className="space-y-4">
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="font-serif">Počet rezervací podle měsíců</CardTitle>
                <CardDescription>Trend v počtu rezervací</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyReservationsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px',
                      }}
                    />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-serif">Příjmy podle měsíců</CardTitle>
                <CardDescription>Trend v příjmech</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monthlyRevenueData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px',
                      }}
                      formatter={(value: any) => `${value.toLocaleString('cs-CZ')} Kč`}
                    />
                    <Line type="monotone" dataKey="amount" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="composition">
          <Card>
            <CardHeader>
              <CardTitle className="font-serif">Skladba hostů</CardTitle>
              <CardDescription>Rozdělení podle věkových kategorií</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
                <div className="text-center p-6 rounded-lg bg-muted/50">
                  <Users className="w-12 h-12 mx-auto mb-2 text-blue-500" />
                  <div className="text-3xl font-serif font-bold">{adultGuests}</div>
                  <div className="text-sm text-muted-foreground">Dospělí</div>
                </div>
                <div className="text-center p-6 rounded-lg bg-muted/50">
                  <Baby className="w-12 h-12 mx-auto mb-2 text-green-500" />
                  <div className="text-3xl font-serif font-bold">{childGuests3to12}</div>
                  <div className="text-sm text-muted-foreground">Děti 3-12 let</div>
                </div>
                <div className="text-center p-6 rounded-lg bg-muted/50">
                  <Baby className="w-12 h-12 mx-auto mb-2 text-orange-500" />
                  <div className="text-3xl font-serif font-bold">{childGuests0to2}</div>
                  <div className="text-sm text-muted-foreground">Děti 0-2 roky</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="status">
          <Card>
            <CardHeader>
              <CardTitle className="font-serif">Stavy rezervací</CardTitle>
              <CardDescription>Rozdělení rezervací podle stavu platby</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={statusDataForChart}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => `${name}: ${percentage}%`}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusDataForChart.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={Object.values(STATUS_COLORS)[index % Object.values(STATUS_COLORS).length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px',
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

      {/* Recent Reservations */}
      <Card>
        <CardHeader>
          <CardTitle className="font-serif">Poslední rezervace</CardTitle>
          <CardDescription>Nejnovější rezervace v systému</CardDescription>
        </CardHeader>
        <CardContent>
          {recentReservations.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Žádné rezervace</p>
          ) : (
            <div className="space-y-3">
              {recentReservations.map((reservation) => (
                <Link key={reservation.id} href={`/reservations/${reservation.id}`}>
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
                      <p className="font-medium truncate">{reservation.contactName}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {dayjs(reservation.date).format('DD.MM.YYYY HH:mm')} • {reservation.contactEmail}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-medium">{reservation.persons?.length || 0}</div>
                        <div className="text-xs text-muted-foreground">osob</div>
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
