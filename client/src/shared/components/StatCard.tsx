import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/shared/components/ui/card";
import { cn } from "@/shared/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  variant?: "default" | "success" | "warning" | "danger" | "info";
  className?: string;
}

const variantStyles: Record<string, { bg: string; text: string; icon: string }> = {
  default: { bg: "bg-muted/50", text: "text-foreground", icon: "text-muted-foreground" },
  success: { bg: "bg-green-500/10", text: "text-green-600", icon: "text-green-500" },
  warning: { bg: "bg-orange-500/10", text: "text-orange-600", icon: "text-orange-500" },
  danger: { bg: "bg-red-500/10", text: "text-red-600", icon: "text-red-500" },
  info: { bg: "bg-blue-500/10", text: "text-blue-600", icon: "text-blue-500" },
};

export function StatCard({ label, value, subtitle, icon: Icon, variant = "default", className }: StatCardProps) {
  const styles = variantStyles[variant] ?? variantStyles.default;

  return (
    <div className={cn("p-4 rounded-lg text-center", styles.bg, className)}>
      {Icon && <Icon className={cn("h-5 w-5 mx-auto mb-1", styles.icon)} />}
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={cn("text-2xl font-bold font-mono", styles.text)}>{value}</p>
      {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
    </div>
  );
}
