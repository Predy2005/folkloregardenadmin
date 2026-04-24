import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { queryClient } from "@/shared/lib/queryClient";
import { successToast, errorToast } from "@/shared/lib/toast-helpers";
import {
  MOBILE_ROLE_DESCRIPTIONS,
  MOBILE_ROLE_LABELS,
  type MobileRole,
} from "@/shared/lib/mobileRoles";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Badge } from "@/shared/components/ui/badge";
import { Separator } from "@/shared/components/ui/separator";
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
  Copy,
  Smartphone,
  KeyRound,
  LockKeyhole,
  LockKeyholeOpen,
  UserX,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

/**
 * Karta pro správu mobilního účtu — znovupoužitelná pro personál i řidiče.
 *
 * Mobilní role (STAFF_WAITER / STAFF_COOK / STAFF_DRIVER) **není na výběr** —
 * backend ji odvozuje automaticky z pracovní pozice (`staffMember.position`)
 * nebo je fixní pro řidiče. UI zobrazuje derivovanou roli jako read-only info
 * a pokud už přiřazená role neodpovídá aktuální pozici (admin změnil position
 * po založení účtu), nabídne tlačítko „Sjednotit roli s pozicí".
 *
 * `basePath` je cesta k resource bez `/mobile-account`, např.
 *   `/api/staff/42`               → personál
 *   `/api/transport/drivers/13`   → řidič
 *
 * Backend endpointy:
 *   GET    {basePath}/mobile-account             → { hasAccount, expectedRole, mobileRoles, roleMismatch, ... }
 *   POST   {basePath}/mobile-account             → { generatePassword, pin?, pinDeviceId? } → { plainPassword?, role, ... }
 *   POST   {basePath}/mobile-account/sync-role   → { status: "synced", role } (jen pro staff)
 *   PUT    {basePath}/mobile-account/password    → { plainPassword }
 *   PUT    {basePath}/mobile-account/pin         → { pin, deviceId? }
 *   DELETE {basePath}/mobile-account/pin
 *   DELETE {basePath}/mobile-account
 */

interface MobileAccount {
  hasAccount: boolean;
  userId?: number;
  email?: string;
  pinEnabled?: boolean;
  mobileRoles?: MobileRole[];
  expectedRole?: MobileRole | null;
  roleMismatch?: boolean;
}

interface CreateResponse {
  status: string;
  userId: number;
  email: string;
  plainPassword: string | null;
  role: MobileRole;
}

interface ResetResponse {
  status: string;
  plainPassword: string;
}

interface MobileAccountCardProps {
  basePath: string;
  /** Default e-mail z nadřazeného formuláře (jen pro info — login je e-mail entity). */
  entityEmail?: string | null;
  /** Zda má entita vyplněný e-mail v DB (bez něj nelze vytvořit účet). */
  canCreate: boolean;
  /**
   * Role, kterou by měla entita dostat podle své pozice. U staffu ji počítáme
   * v caller komponentě přes `deriveMobileRoleFromPosition(member.position)`,
   * u řidiče vždy `STAFF_DRIVER`. Když `null`, UI vyzve k vyplnění pozice.
   */
  derivedRole: MobileRole | null;
  /** Zda controller podporuje PUT .../sync-role (jen pro staff, driver ne). */
  supportsSyncRole?: boolean;
}

export function MobileAccountCard({
  basePath,
  entityEmail,
  canCreate,
  derivedRole,
  supportsSyncRole = false,
}: MobileAccountCardProps) {
  const queryKey = [basePath, "mobile-account"];

  const { data: account, isLoading } = useQuery<MobileAccount>({
    queryKey,
    queryFn: () => api.get(`${basePath}/mobile-account`),
  });

  const [generatePassword, setGeneratePassword] = useState(true);
  const [pinInput, setPinInput] = useState("");
  const [deviceIdInput, setDeviceIdInput] = useState("");
  const [lastPassword, setLastPassword] = useState<string | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState(false);

  const createMutation = useMutation<CreateResponse, Error, void>({
    mutationFn: async () => {
      const body: Record<string, unknown> = { generatePassword };
      if (pinInput) {
        body.pin = pinInput;
        if (deviceIdInput) body.pinDeviceId = deviceIdInput;
      }
      return api.post(`${basePath}/mobile-account`, body);
    },
    onSuccess: (res) => {
      setLastPassword(res.plainPassword);
      setPinInput("");
      setDeviceIdInput("");
      queryClient.invalidateQueries({ queryKey });
      successToast(
        `Mobilní účet vytvořen (role ${MOBILE_ROLE_LABELS[res.role] ?? res.role})`,
      );
    },
    onError: (err) => errorToast(err),
  });

  const resetPwdMutation = useMutation<ResetResponse, Error, void>({
    mutationFn: () => api.put(`${basePath}/mobile-account/password`, {}),
    onSuccess: (res) => {
      setLastPassword(res.plainPassword);
      successToast("Nové heslo vygenerováno");
    },
    onError: (err) => errorToast(err),
  });

  const setPinMutation = useMutation<unknown, Error, void>({
    mutationFn: () =>
      api.put(`${basePath}/mobile-account/pin`, {
        pin: pinInput,
        deviceId: deviceIdInput || null,
      }),
    onSuccess: () => {
      setPinInput("");
      setDeviceIdInput("");
      queryClient.invalidateQueries({ queryKey });
      successToast("PIN nastaven");
    },
    onError: (err) => errorToast(err),
  });

  const disablePinMutation = useMutation<unknown, Error, void>({
    mutationFn: () => api.delete(`${basePath}/mobile-account/pin`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      successToast("PIN deaktivován");
    },
    onError: (err) => errorToast(err),
  });

  const revokeMutation = useMutation<unknown, Error, void>({
    mutationFn: () => api.delete(`${basePath}/mobile-account`),
    onSuccess: () => {
      setLastPassword(null);
      queryClient.invalidateQueries({ queryKey });
      successToast("Mobilní účet zrušen");
    },
    onError: (err) => errorToast(err),
  });

  const syncRoleMutation = useMutation<{ role: MobileRole }, Error, void>({
    mutationFn: () => api.post(`${basePath}/mobile-account/sync-role`, {}),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey });
      successToast(
        `Role sjednocena na ${MOBILE_ROLE_LABELS[res.role] ?? res.role}`,
      );
    },
    onError: (err) => errorToast(err),
  });

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      successToast("Zkopírováno do schránky");
    } catch {
      errorToast("Kopírování se nezdařilo");
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const missingPosition = derivedRole === null && !account?.hasAccount;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="w-5 h-5" />
          Mobilní přístup
          {account?.hasAccount && (
            <Badge variant="default" className="ml-2">
              <CheckCircle2 className="w-3 h-3 mr-1" /> aktivní
            </Badge>
          )}
          {!account?.hasAccount && (
            <Badge variant="outline" className="ml-2">bez účtu</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {lastPassword && (
          <Alert>
            <KeyRound className="w-4 h-4" />
            <AlertDescription>
              <div className="flex flex-col gap-2">
                <div>
                  <strong>Vygenerované heslo (zobrazeno pouze teď):</strong>
                </div>
                <div className="flex items-center gap-2">
                  <code className="bg-muted px-3 py-2 rounded font-mono text-sm flex-1">
                    {lastPassword}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copy(lastPassword)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground">
                  Po zavření této obrazovky ho už nepůjde vyvolat — předej ho personálu ihned.
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {!account?.hasAccount ? (
          <div className="space-y-4">
            {!canCreate && (
              <Alert variant="destructive">
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>
                  Nejprve uložte e-mail na profilu — mobilní účet používá e-mail jako přihlašovací jméno.
                </AlertDescription>
              </Alert>
            )}

            {canCreate && missingPosition && (
              <Alert variant="destructive">
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>
                  Mobilní roli nejde odvodit — nejprve vyberte pozici na záložce Profil
                  (Číšník, Kuchař, Řidič, …).
                </AlertDescription>
              </Alert>
            )}

            {canCreate && derivedRole !== null && (
              <>
                <div className="rounded-md border bg-muted/40 p-3 space-y-1 text-sm">
                  <div className="text-muted-foreground">E-mail pro přihlášení:</div>
                  <div className="font-medium">{entityEmail}</div>
                  <div className="text-muted-foreground mt-2">Mobilní role (odvozená z pozice):</div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{MOBILE_ROLE_LABELS[derivedRole]}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {MOBILE_ROLE_DESCRIPTIONS[derivedRole]}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="text-sm font-medium">Způsob přihlášení</div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={generatePassword}
                      onChange={(e) => setGeneratePassword(e.target.checked)}
                    />
                    Vygenerovat heslo (lze ho použít pro web i mobil)
                  </label>

                  <div className="space-y-1">
                    <Label>PIN (volitelně, 4–6 číslic)</Label>
                    <Input
                      value={pinInput}
                      onChange={(e) => setPinInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="např. 1234"
                      inputMode="numeric"
                      maxLength={6}
                    />
                  </div>

                  {pinInput && (
                    <div className="space-y-1">
                      <Label>Device ID (volitelně – PIN login jen z tohoto zařízení)</Label>
                      <Input
                        value={deviceIdInput}
                        onChange={(e) => setDeviceIdInput(e.target.value)}
                        placeholder="opíše se z mobilu při prvním přihlášení"
                      />
                    </div>
                  )}
                </div>

                <Button
                  onClick={() => createMutation.mutate()}
                  disabled={createMutation.isPending || (!generatePassword && !pinInput)}
                >
                  {createMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Smartphone className="w-4 h-4 mr-2" />
                  )}
                  Vytvořit mobilní účet
                </Button>
                {!generatePassword && !pinInput && (
                  <div className="text-xs text-muted-foreground">
                    Zvolte aspoň jednu přihlašovací metodu (heslo nebo PIN).
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm space-y-1">
              <div>
                <span className="text-muted-foreground">E-mail: </span>
                <strong>{account.email}</strong>
              </div>
              <div>
                <span className="text-muted-foreground">Role: </span>
                {account.mobileRoles?.length
                  ? account.mobileRoles.map((r) => (
                      <Badge key={r} variant="secondary" className="mr-1">
                        {MOBILE_ROLE_LABELS[r as MobileRole] ?? r}
                      </Badge>
                    ))
                  : <span className="italic text-muted-foreground">žádná mobilní role</span>}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">PIN: </span>
                {account.pinEnabled ? (
                  <Badge variant="default">
                    <LockKeyhole className="w-3 h-3 mr-1" /> aktivní
                  </Badge>
                ) : (
                  <Badge variant="outline">
                    <LockKeyholeOpen className="w-3 h-3 mr-1" /> vypnutý
                  </Badge>
                )}
              </div>
            </div>

            {/* Varování o mismatchi mezi pozicí a přiřazenou rolí */}
            {account.roleMismatch && account.expectedRole && supportsSyncRole && (
              <Alert>
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>
                  <div className="flex flex-col gap-2">
                    <span>
                      Pozice se změnila. Podle aktuální pozice by měl mít role{" "}
                      <strong>{MOBILE_ROLE_LABELS[account.expectedRole]}</strong>.
                    </span>
                    <div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => syncRoleMutation.mutate()}
                        disabled={syncRoleMutation.isPending}
                      >
                        {syncRoleMutation.isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4 mr-2" />
                        )}
                        Sjednotit roli s pozicí
                      </Button>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <Separator />

            <div className="space-y-3">
              <div className="text-sm font-medium">Heslo</div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => resetPwdMutation.mutate()}
                disabled={resetPwdMutation.isPending}
              >
                {resetPwdMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <KeyRound className="w-4 h-4 mr-2" />
                )}
                Vygenerovat nové heslo
              </Button>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="text-sm font-medium">PIN pro mobilku</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Input
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="4–6 číslic"
                  inputMode="numeric"
                  maxLength={6}
                />
                <Input
                  value={deviceIdInput}
                  onChange={(e) => setDeviceIdInput(e.target.value)}
                  placeholder="Device ID (volitelně)"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => setPinMutation.mutate()}
                  disabled={setPinMutation.isPending || pinInput.length < 4}
                >
                  {setPinMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <LockKeyhole className="w-4 h-4 mr-2" />
                  )}
                  {account.pinEnabled ? "Změnit PIN" : "Aktivovat PIN"}
                </Button>
                {account.pinEnabled && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => disablePinMutation.mutate()}
                    disabled={disablePinMutation.isPending}
                  >
                    {disablePinMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <LockKeyholeOpen className="w-4 h-4 mr-2" />
                    )}
                    Deaktivovat PIN
                  </Button>
                )}
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="text-sm font-medium text-destructive">Zrušit mobilní přístup</div>
              <div className="text-xs text-muted-foreground">
                Smaže User účet a odpojí ho od záznamu. Nelze vrátit zpět – pro znovu-zavedení vytvořte nový.
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setConfirmRevoke(true)}
                disabled={revokeMutation.isPending}
              >
                <UserX className="w-4 h-4 mr-2" />
                Zrušit účet
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      <AlertDialog open={confirmRevoke} onOpenChange={setConfirmRevoke}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Opravdu zrušit mobilní účet?</AlertDialogTitle>
            <AlertDialogDescription>
              Smaže User účet „{account?.email}" a odebere všechny mobilní role.
              Personál se nebude moci přihlásit do mobilní aplikace.
              Záznam personálu/řidiče zůstane zachován – jen přijde o přístup.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmRevoke(false);
                revokeMutation.mutate();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Zrušit účet
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
