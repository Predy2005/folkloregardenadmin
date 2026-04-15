import { Card, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import type { LucideIcon } from 'lucide-react';

export interface StatItem {
  title: string;
  value: string | number;
  subtitle: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
}

interface DashboardStatsProps {
  stats: StatItem[];
}

export function DashboardStats({ stats }: DashboardStatsProps) {
  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-5">
      {stats.map((stat) => (
        <Card key={stat.title} className="hover-elevate">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardDescription className="text-sm">
                  {stat.title}
                </CardDescription>
                <CardTitle
                  className="text-xl font-serif font-bold"
                  data-testid={`stat-${stat.title.toLowerCase().replace(/ /g, "-")}`}
                >
                  {stat.value}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {stat.subtitle}
                </p>
              </div>
              <div
                className={`w-10 h-10 rounded-full ${stat.bgColor} flex items-center justify-center flex-shrink-0`}
              >
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </div>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}
