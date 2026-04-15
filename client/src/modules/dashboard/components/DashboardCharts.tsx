import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Users, Baby } from 'lucide-react';
import { formatCurrency } from '@/shared/lib/formatting';
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

interface DashboardChartsProps {
  monthlyReservationsData: { month: string; count: number }[];
  monthlyRevenueData: { month: string; amount: number }[];
  statusDataForChart: { name: string; value: number; percentage: string }[];
  adultGuests: number;
  childGuests3to12: number;
  childGuests0to2: number;
  futureReservationsByDay: { date: string; label: string; count: number }[];
}

export function DashboardCharts({
  monthlyReservationsData,
  monthlyRevenueData,
  statusDataForChart,
  adultGuests,
  childGuests3to12,
  childGuests0to2,
  futureReservationsByDay,
}: DashboardChartsProps) {
  return (
    <Tabs defaultValue="monthly" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="monthly">Měsíční přehledy</TabsTrigger>
        <TabsTrigger value="composition">Skladba hostů</TabsTrigger>
        <TabsTrigger value="status">Stavy rezervací</TabsTrigger>
        <TabsTrigger value="by-day">Rezervace dle dnů</TabsTrigger>
      </TabsList>

      <TabsContent value="monthly" className="space-y-4">
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="font-serif">
                Počet rezervací podle měsíců
              </CardTitle>
              <CardDescription>Trend v počtu rezervací</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyReservationsData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    dataKey="month"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                    }}
                  />
                  <Bar
                    dataKey="count"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-serif">
                Příjmy podle měsíců
              </CardTitle>
              <CardDescription>Trend v příjmech</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyRevenueData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    dataKey="month"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                    }}
                    formatter={(value: number) =>
                      `${formatCurrency(value)}`
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
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
            <CardDescription>
              Rozdělení podle věkových kategorií
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
              <div className="text-center p-6 rounded-lg bg-muted/50">
                <Users className="w-12 h-12 mx-auto mb-2 text-blue-500" />
                <div className="text-3xl font-serif font-bold">
                  {adultGuests}
                </div>
                <div className="text-sm text-muted-foreground">Dospělí</div>
              </div>
              <div className="text-center p-6 rounded-lg bg-muted/50">
                <Baby className="w-12 h-12 mx-auto mb-2 text-green-500" />
                <div className="text-3xl font-serif font-bold">
                  {childGuests3to12}
                </div>
                <div className="text-sm text-muted-foreground">
                  Děti 3-12 let
                </div>
              </div>
              <div className="text-center p-6 rounded-lg bg-muted/50">
                <Baby className="w-12 h-12 mx-auto mb-2 text-orange-500" />
                <div className="text-3xl font-serif font-bold">
                  {childGuests0to2}
                </div>
                <div className="text-sm text-muted-foreground">
                  Děti 0-2 roky
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="status">
        <Card>
          <CardHeader>
            <CardTitle className="font-serif">Stavy rezervací</CardTitle>
            <CardDescription>
              Rozdělení rezervací podle stavu platby
            </CardDescription>
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
                    label={({ name, percentage }) =>
                      `${name}: ${percentage}%`
                    }
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusDataForChart.map((_entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          Object.values(STATUS_COLORS)[
                            index % Object.values(STATUS_COLORS).length
                          ]
                        }
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="by-day">
        <Card>
          <CardHeader>
            <CardTitle className="font-serif">
              Rezervace dle dnů (budoucí)
            </CardTitle>
            <CardDescription>
              Dny s nejvyšším počtem budoucích rezervací
            </CardDescription>
          </CardHeader>
          <CardContent>
            {futureReservationsByDay.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Žádné budoucí rezervace
              </p>
            ) : (
              <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Datum</TableHead>
                        <TableHead className="text-right">
                          Počet rezervací
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {futureReservationsByDay.slice(0, 20).map((d) => (
                        <TableRow key={d.date}>
                          <TableCell className="font-medium">
                            {d.label}
                          </TableCell>
                          <TableCell className="text-right">
                            {d.count}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={futureReservationsByDay.slice(0, 12)}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="hsl(var(--border))"
                      />
                      <XAxis
                        dataKey="label"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        interval={0}
                        angle={-30}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "6px",
                        }}
                      />
                      <Bar
                        dataKey="count"
                        fill="hsl(var(--primary))"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
