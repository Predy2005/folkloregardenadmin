import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";

import { API_BASE_URL, MOBILE_PATHS } from "@/constants/api";
import {
  apiFetch,
  ApiError,
  setSessionExpiredHandler,
} from "@/lib/apiClient";
import { deriveUiRole, type UiRole } from "@/lib/mobileRoles";
import { registerPush, unregisterPush } from "@/lib/push";
import {
  getOrCreateDeviceId,
  secureDelete,
  secureGet,
  secureSet,
} from "@/lib/secureStorage";

/**
 * User shape vrácený z `/api/mobile/auth/me` (a jako pod-pole loginu).
 * Odpovídá `App\Service\MobileAuthService::describeUser()` na backendu.
 */
export interface MobileUser {
  id: number;
  username: string;
  email: string;
  roles: string[];
  permissions: string[];
  isSuperAdmin?: boolean;
  pinEnabled?: boolean;
  staffMemberId?: number | null;
  staffMemberName?: string | null;
  transportDriverId?: number | null;
  transportDriverName?: string | null;
}

interface LoginResponse {
  accessToken: string;
  accessTokenExpiresIn: number;
  refreshToken: string;
  refreshTokenExpiresAt: string;
  user: MobileUser;
}

interface AuthState {
  user: MobileUser | null;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  loginWithPin: (identifier: string, pin: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Znovu načte /me — např. po network reconnect nebo po refreshi appky. */
  reloadUser: () => Promise<void>;
  /** Bootstrap při startu appky — ověří existující token přes /me. */
  bootstrap: () => Promise<void>;
}

async function persistTokens(res: LoginResponse): Promise<void> {
  await Promise.all([
    secureSet("accessToken", res.accessToken),
    secureSet("refreshToken", res.refreshToken),
  ]);
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  isLoading: true,

  async bootstrap() {
    try {
      const token = await secureGet("accessToken");
      if (!token) return;
      const me = await apiFetch<MobileUser>(MOBILE_PATHS.me);
      set({ user: me });
      // Re-registrace push tokenu — Expo token se občas rotuje, bez re-registrace
      // by DB držela mrtvý záznam a push by se nedoručil.
      void registerPush();
    } catch (e) {
      if (!(e instanceof ApiError) || e.status !== 401) {
        // eslint-disable-next-line no-console
        console.warn("Auth bootstrap failed:", e);
      }
    } finally {
      set({ isLoading: false });
    }
  },

  async login(identifier, password) {
    const deviceId = await getOrCreateDeviceId();
    // Login volá přes raw fetch (ne apiFetch) — ještě nemáme access token
    // a chceme kontrolu nad chybovou hláškou.
    const response = await fetch(`${API_BASE_URL}${MOBILE_PATHS.login}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password, deviceId }),
    });
    if (!response.ok) {
      const err = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(err.error ?? "Přihlášení se nezdařilo");
    }
    const data = (await response.json()) as LoginResponse;
    await persistTokens(data);
    await secureSet("identifier", identifier);
    set({ user: data.user });
    // Push registrace — tolerantní, nerozbije login při chybě.
    void registerPush();
  },

  async loginWithPin(identifier, pin) {
    const deviceId = await getOrCreateDeviceId();
    const response = await fetch(`${API_BASE_URL}${MOBILE_PATHS.pinLogin}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, pin, deviceId }),
    });
    if (!response.ok) {
      const err = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(err.error ?? "PIN přihlášení se nezdařilo");
    }
    const data = (await response.json()) as LoginResponse;
    await persistTokens(data);
    await secureSet("identifier", identifier);
    set({ user: data.user });
    void registerPush();
  },

  async logout() {
    // Odregistruj push token před zneplatněním access tokenu — poté už
    // apiFetch nemá jak autentizovat DELETE /devices/by-token.
    await unregisterPush();

    // Defensivně — sdělit serveru (aby zneplatnil refresh token), ale i když
    // to selže (offline), lokálně pokračujeme.
    const refreshToken = await secureGet("refreshToken");
    if (refreshToken) {
      try {
        await fetch(`${API_BASE_URL}${MOBILE_PATHS.logout}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });
      } catch {
        // offline / 5xx → ignoruj
      }
    }

    await Promise.all([
      secureDelete("accessToken"),
      secureDelete("refreshToken"),
      // PIN necháváme — user se může chtít přihlásit zpátky PINem.
      // Revoke PINu je na admin straně.
    ]);
    set({ user: null });
  },

  async reloadUser() {
    try {
      const me = await apiFetch<MobileUser>(MOBILE_PATHS.me);
      set({ user: me });
    } catch {
      // 401 → apiClient už session vyčistil + zavolá sessionExpiredHandler.
    }
  },
}));

// Když apiClient detekuje smrt session (refresh selhal), zahoď user state.
// Nastavuje se jednou při load modulu — `setSessionExpiredHandler(null)` by
// vrátil výchozí (no-op) chování, což nikdo nechce.
setSessionExpiredHandler(() => useAuthStore.setState({ user: null }));

/**
 * Drop-in replacement za původní `useAuth()` z `@/context/AuthContext`.
 * Vrací celý context-shape (derivuje `role` z `user.roles`). Díky
 * `useShallow` se komponenta rerenderuje jen když se změní pole v tom shape.
 *
 * Callers, kteří potřebují jen výřez (např. pouze `role`), mohou přímo:
 *   `const role = useAuthStore((s) => deriveUiRole(s.user?.roles));`
 */
export function useAuth() {
  return useAuthStore(
    useShallow((s) => ({
      user: s.user,
      role: deriveUiRole(s.user?.roles),
      isLoading: s.isLoading,
      login: s.login,
      loginWithPin: s.loginWithPin,
      logout: s.logout,
      reloadUser: s.reloadUser,
    })),
  );
}

/** Zpětně kompatibilní typ (některé starší komponenty importují `UserRole`). */
export type UserRole = UiRole;
