import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Loader2, Users, AlertCircle, CheckCircle2 } from "lucide-react";
import { api } from "@/shared/lib/api";
import type { EventStaffAssignment, StaffMember } from "@shared/types";
import { translateStaffRole } from "@modules/staff/utils/staffRoles";

interface StaffCategory {
  category: string;
  ratio: number;
  enabled: boolean;
  required: number;
}

interface StaffRecommendation {
  guests: number;
  totalRequired: number;
  byCategory: StaffCategory[];
}

interface StaffRecommendationCardProps {
  guestsTotal: number;
  staffAssignments: EventStaffAssignment[];
  staffMembers: StaffMember[];
}

// Additional category labels not in central STAFF_ROLE_LABELS
const EXTRA_CATEGORY_LABELS: Record<string, string> = {
  COOK: "Kuchař",
  HOST: "Hosteska",
  DEFAULT: "Ostatní",
};

export default function StaffRecommendationCard({
  guestsTotal,
  staffAssignments,
  staffMembers,
}: StaffRecommendationCardProps) {
  // Fetch recommendation based on guest count
  const { data: recommendation, isLoading } = useQuery<StaffRecommendation>({
    queryKey: ["/api/staffing-formulas/recommendation", guestsTotal],
    queryFn: async () =>
      api.get(`/api/staffing-formulas/recommendation?guests=${guestsTotal}`),
    enabled: guestsTotal > 0,
  });

  // Count current assignments by category
  const currentByCategory: Record<string, number> = {};
  staffAssignments.forEach((assignment) => {
    // Get role from staff member
    const member = staffMembers.find((m) => m.id === assignment.staffMemberId);
    const category = member?.position || "DEFAULT";
    currentByCategory[category] = (currentByCategory[category] || 0) + 1;
  });

  // Get category label - uses central translations first, then fallback
  const getCategoryLabel = (category: string) => {
    const translated = translateStaffRole(category);
    // If translateStaffRole returns the original code, check extra labels
    if (translated === category) {
      return EXTRA_CATEGORY_LABELS[category.toUpperCase()] || category;
    }
    return translated;
  };

  // Calculate difference
  const getDiff = (category: string, required: number) => {
    const current = currentByCategory[category.toUpperCase()] || 0;
    return current - required;
  };

  // Get diff badge
  const getDiffBadge = (diff: number) => {
    if (diff === 0) {
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          OK
        </Badge>
      );
    } else if (diff > 0) {
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          +{diff} navíc
        </Badge>
      );
    } else {
      return (
        <Badge variant="destructive" className="bg-red-50 text-red-700 border-red-200">
          <AlertCircle className="h-3 w-3 mr-1" />
          Chybí {Math.abs(diff)}
        </Badge>
      );
    }
  };

  if (guestsTotal === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="h-4 w-4" />
            Doporučení personálu
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Zadejte počet hostů pro zobrazení doporučení
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="h-4 w-4" />
            Doporučení personálu
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!recommendation) {
    return null;
  }

  // Calculate totals
  const totalRequired = recommendation.totalRequired;
  const totalCurrent = staffAssignments.length;
  const totalDiff = totalCurrent - totalRequired;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Doporučení personálu
          </span>
          <span className="text-xs font-normal text-muted-foreground">
            Pro {guestsTotal} hostů
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Summary */}
        <div className="flex items-center justify-between mb-4 p-3 bg-muted rounded-lg">
          <div>
            <p className="text-sm font-medium">Celkem personálu</p>
            <p className="text-xs text-muted-foreground">
              Aktuálně: {totalCurrent} / Doporučeno: {totalRequired}
            </p>
          </div>
          {getDiffBadge(totalDiff)}
        </div>

        {/* By category */}
        <div className="space-y-2">
          {recommendation.byCategory.map((cat) => {
            const current = currentByCategory[cat.category.toUpperCase()] || 0;
            const diff = getDiff(cat.category, cat.required);

            return (
              <div
                key={cat.category}
                className="flex items-center justify-between py-2 border-b last:border-0"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {getCategoryLabel(cat.category)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    (1:{cat.ratio})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm">
                    {current} / {cat.required}
                  </span>
                  {getDiffBadge(diff)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Note */}
        <p className="text-xs text-muted-foreground mt-4">
          Doporučení vychází z poměrů nastavených v Staffing Formulas.
          Přejděte do záložky "Personál" pro přiřazení členů týmu.
        </p>
      </CardContent>
    </Card>
  );
}
