import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Progress } from "@/shared/components/ui/progress";
import { cn } from "@/shared/lib/utils";

export interface SubmitProgressCardProps {
  isSubmitting: boolean;
  submitProgress: number;
  submitResults: { success: boolean; date: string; error?: string }[];
  reservationCount: number;
}

export function SubmitProgressCard({
  isSubmitting,
  submitProgress,
  submitResults,
  reservationCount,
}: SubmitProgressCardProps) {
  return (
    <>
      {/* Progress bar for bulk submit */}
      {isSubmitting && reservationCount > 1 && (
        <Card>
          <CardContent className="pt-6">
            <Progress value={submitProgress} className="w-full" />
            <p className="text-sm text-muted-foreground mt-2">
              Vytvářím rezervace... {Math.round(submitProgress)}%
            </p>
          </CardContent>
        </Card>
      )}

      {/* Submit results */}
      {submitResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Výsledky vytváření</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {submitResults.map((r, i) => (
                <div
                  key={i}
                  className={cn(
                    "text-sm",
                    r.success ? "text-green-600" : "text-red-600",
                  )}
                >
                  {r.date}: {r.success ? "\u2713 Vytvořeno" : `\u2717 ${r.error}`}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
