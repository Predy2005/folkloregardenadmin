/**
 * Base URL of the Folklore Garden CRM API used by the mobile app.
 *
 * Single source of truth — all fetch/API hooks must import `API_BASE_URL`
 * from this file, not hardcode the URL or read `process.env` directly.
 *
 * When the backend moves to a new host, change `DEFAULT_API_BASE_URL` here
 * (or override per-build with the `EXPO_PUBLIC_API_URL` env var — useful for
 * staging/production split without touching source).
 *
 * Note on Expo env access: `process.env.EXPO_PUBLIC_*` must be read as a
 * literal member expression so the Babel plugin inlines it into the bundle.
 * Do NOT destructure (`const { EXPO_PUBLIC_API_URL } = process.env`) — that
 * breaks the inlining and the value becomes `undefined` on device.
 */

const DEFAULT_API_BASE_URL = "https://apifolklore.testujeme.online";

export const API_BASE_URL: string =
  process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_API_BASE_URL;

/**
 * Cesty mobilních endpointů. Backend je implementuje pod `/api/mobile/*`
 * (viz `api/src/Controller/MobileAuthController.php`, `MobileMeController.php`,
 * `MobileDeviceController.php`).
 */
export const MOBILE_PATHS = {
  // Auth
  login: "/api/mobile/auth/login",
  pinLogin: "/api/mobile/auth/pin-login",
  refresh: "/api/mobile/auth/refresh",
  logout: "/api/mobile/auth/logout",
  me: "/api/mobile/auth/me",

  // Staff data
  events: "/api/mobile/me/events",
  eventDetail: (id: number | string) => `/api/mobile/me/events/${id}`,
  checkIn: "/api/mobile/me/attendance/checkin",
  checkOut: "/api/mobile/me/attendance/checkout",

  // Driver data
  transports: "/api/mobile/me/transports",
  transportDetail: (id: number | string) => `/api/mobile/me/transports/${id}`,
  transportStatus: (id: number | string) =>
    `/api/mobile/me/transports/${id}/status`,

  // Push devices
  deviceRegister: "/api/mobile/devices/register",
  deviceDeleteByToken: "/api/mobile/devices/by-token",
} as const;
