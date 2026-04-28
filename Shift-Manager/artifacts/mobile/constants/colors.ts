/**
 * Barvy sjednocené s hlavním CRM (`client/src/index.css`). Hodnoty jsou
 * převody z `--primary: 1 83% 47%` a příbuzných CSS HSL tokenů.
 *
 * Logo paleta (`assets/images/logo.svg`):
 *   - červená  #DC1A15  (primary, tint)
 *   - zelená   #0E7834  (accent, success, info — listová linka loga)
 *   - tmavá    #21150C  (text na logu)
 */
const colors = {
  light: {
    text: "#262626",
    tint: "#DC1A15",

    background: "#FFFFFF",
    foreground: "#262626",

    card: "#FFFFFF",
    cardForeground: "#262626",

    // Brand primary — červená z loga / CRM `--primary`
    primary: "#DC1A15",
    primaryForeground: "#FFFFFF",

    // CRM `--secondary: 0 0% 96%` — neutrální světle šedá.
    secondary: "#F5F5F5",
    secondaryForeground: "#262626",

    muted: "#F5F5F5",
    mutedForeground: "#737373",

    // CRM `--accent: 142 30% 95%` — jemný zelenkavý odstín pro hover/aktivní state
    accent: "#F1F7F3",
    accentForeground: "#262626",

    // CRM `--destructive: 0 84% 60%`
    destructive: "#EF4444",
    destructiveForeground: "#FFFFFF",

    // CRM `--border: 0 0% 92%`
    border: "#EBEBEB",
    input: "#EBEBEB",

    warning: "#F4A261",
    warningForeground: "#FFFFFF",

    // Info/success — zelená z loga (`#0E7834`). Driver flow (TransportCard,
    // "Jedu" tlačítko) tím dostává barvu konzistentní s CRM akcentem.
    info: "#0E7834",
    infoForeground: "#FFFFFF",

    success: "#0E7834",
    successForeground: "#FFFFFF",
  },
  radius: 12,
};

export default colors;
