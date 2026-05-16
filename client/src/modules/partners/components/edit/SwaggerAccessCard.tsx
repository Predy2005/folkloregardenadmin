import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { BookOpen, Copy, RotateCcw, Trash2, ShieldAlert, Check, ExternalLink } from "lucide-react";
import { api } from "@/shared/lib/api";
import { successToast, errorToast } from "@/shared/lib/toast-helpers";
import { useAuth } from "@/modules/auth";

interface SwaggerAccessCardProps {
  partnerId: number;
  swaggerAccess?: {
    username: string | null;
    generatedAt: string | null;
    active: boolean;
  };
}

interface GenerateResponse {
  username: string;
  password: string;
  generatedAt: string;
}

const SWAGGER_URL =
  (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000") + "/api/doc/partner";

export function SwaggerAccessCard({ partnerId, swaggerAccess }: SwaggerAccessCardProps) {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canManage = hasPermission("partners.update");

  const [generated, setGenerated] = useState<GenerateResponse | null>(null);
  const [confirmRotate, setConfirmRotate] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [copiedField, setCopiedField] = useState<"username" | "password" | null>(null);

  const generateMutation = useMutation({
    mutationFn: () =>
      api.post<GenerateResponse>(`/api/partner/${partnerId}/swagger-credentials`),
    onSuccess: (data) => {
      setGenerated(data);
      setConfirmRotate(false);
      qc.invalidateQueries({ queryKey: ["partner", partnerId] });
      successToast("Swagger přístup vygenerován. Zkopíruj heslo — uvidíš ho jen jednou.");
    },
    onError: (err) => errorToast(err),
  });

  const revokeMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/api/partner/${partnerId}/swagger-credentials`);
    },
    onSuccess: () => {
      setConfirmRevoke(false);
      qc.invalidateQueries({ queryKey: ["partner", partnerId] });
      successToast("Swagger přístup zneplatněn.");
    },
    onError: (err) => errorToast(err),
  });

  const handleCopy = (text: string, field: "username" | "password") => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const hasActive = swaggerAccess?.active === true;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <BookOpen className="w-4 h-4" />
          Swagger UI přístup
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Přihlašovací údaje pro partnerskou Swagger UI dokumentaci na{" "}
          <a
            href={SWAGGER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs inline-flex items-center gap-1 underline hover:text-foreground"
          >
            {SWAGGER_URL}
            <ExternalLink className="w-3 h-3" />
          </a>
          . Po loginu Swagger automaticky vyplní X-API-Key, takže partner může
          rovnou testovat endpointy bez vkládání production klíče.
        </p>

        {hasActive ? (
          <>
            <div className="text-sm space-y-1">
              <div>
                Uživatel:{" "}
                <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs">
                  {swaggerAccess?.username}
                </code>
              </div>
              {swaggerAccess?.generatedAt && (
                <div className="text-muted-foreground text-xs">
                  Vytvořeno {new Date(swaggerAccess.generatedAt).toLocaleString("cs-CZ")}
                </div>
              )}
            </div>
            {canManage && (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmRotate(true)}
                  disabled={generateMutation.isPending}
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                  Rotovat heslo
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => setConfirmRevoke(true)}
                  disabled={revokeMutation.isPending}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  Zneplatnit
                </Button>
              </div>
            )}
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Partner zatím nemá Swagger přístup. Vygenerování vytvoří unikátní
              username + heslo pro Basic Auth.
            </p>
            {canManage && (
              <Button
                type="button"
                size="sm"
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending}
              >
                <BookOpen className="w-3.5 h-3.5 mr-1.5" />
                Vygenerovat přístup
              </Button>
            )}
          </>
        )}
      </CardContent>

      <Dialog open={generated !== null} onOpenChange={(open) => !open && setGenerated(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-500" />
              Nové Swagger credentials
            </DialogTitle>
            <DialogDescription>
              Heslo uvidíš <strong>jen jednou</strong>. Zkopíruj ho hned a předej
              partnerovi bezpečným kanálem. V databázi je uložený jen bcrypt hash —
              pokud heslo ztratíš, musíš rotovat.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Uživatelské jméno</Label>
              <div className="flex gap-2">
                <Input
                  value={generated?.username ?? ""}
                  readOnly
                  className="font-mono text-sm"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <Button
                  type="button"
                  onClick={() => generated && handleCopy(generated.username, "username")}
                  variant="outline"
                  size="icon"
                >
                  {copiedField === "username" ? (
                    <Check className="w-4 h-4 text-success" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Heslo</Label>
              <div className="flex gap-2">
                <Input
                  value={generated?.password ?? ""}
                  readOnly
                  className="font-mono text-sm"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <Button
                  type="button"
                  onClick={() => generated && handleCopy(generated.password, "password")}
                  variant="outline"
                  size="icon"
                >
                  {copiedField === "password" ? (
                    <Check className="w-4 h-4 text-success" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" onClick={() => setGenerated(null)}>
              Mám zkopírováno
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmRotate} onOpenChange={setConfirmRotate}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rotovat Swagger přístup?</AlertDialogTitle>
            <AlertDialogDescription>
              Stávající username a heslo přestanou fungovat okamžitě. Vygeneruje
              se nový pár, který musíš partnerovi předat.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction onClick={() => generateMutation.mutate()}>
              Rotovat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmRevoke} onOpenChange={setConfirmRevoke}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Zneplatnit Swagger přístup?</AlertDialogTitle>
            <AlertDialogDescription>
              Credentials budou smazány. Partner se nebude moci přihlásit do
              Swagger UI, dokud mu nevygenuruješ nové.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => revokeMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Zneplatnit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
