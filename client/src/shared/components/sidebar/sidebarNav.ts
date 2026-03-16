import {
  Calendar,
  CreditCard,
  Home,
  Users,
  UtensilsCrossed,
  CalendarOff,
  Package,
  ChefHat,
  ArrowUpDown,
  ClipboardCheck,
  Users2,
  Ticket,
  DollarSign,
  UserCog,
  Clock,
  Wallet,
  CalendarDays,
  LucideIcon,
  Calculator,
  Shield,
  Settings,
  FileText,
  Building2,
  Tag,
} from "lucide-react";
import { PERMISSIONS } from "@modules/auth";

export interface SubMenuItem {
  title: string;
  url: string;
  icon: LucideIcon;
  permission?: string;
}

export interface MenuItem {
  title: string;
  url?: string;
  icon: LucideIcon;
  permission?: string;
  permissions?: string[];
  items?: SubMenuItem[];
}

export const menuItems: MenuItem[] = [
  {
    title: "Dashboard",
    url: "/",
    icon: Home,
    permission: PERMISSIONS.DASHBOARD_READ,
  },
  {
    title: "Rezervace",
    url: "/reservations",
    icon: Calendar,
    permission: PERMISSIONS.RESERVATIONS_READ,
  },
  {
    title: "Akce",
    url: "/events",
    icon: CalendarDays,
    permission: PERMISSIONS.EVENTS_READ,
  },
  {
    title: "Platby",
    url: "/payments",
    icon: CreditCard,
    permission: PERMISSIONS.PAYMENTS_READ,
  },
  {
    title: "Faktury",
    url: "/invoices",
    icon: FileText,
    permission: PERMISSIONS.PAYMENTS_READ, // Faktury jsou součástí plateb
  },
  {
    title: "Adresář",
    url: "/contacts",
    icon: Users,
    permission: PERMISSIONS.CONTACTS_READ,
  },
  {
    title: "Jídla",
    url: "/foods",
    icon: UtensilsCrossed,
    permission: PERMISSIONS.FOODS_READ,
  },
  {
    title: "Cenník",
    url: "/pricing",
    icon: DollarSign,
    permission: PERMISSIONS.PRICING_READ,
  },
  {
    title: "Sklad",
    icon: Package,
    permissions: [
      PERMISSIONS.STOCK_ITEMS_READ,
      PERMISSIONS.RECIPES_READ,
      PERMISSIONS.STOCK_MOVEMENTS_READ,
    ],
    items: [
      {
        title: "Položky skladu",
        url: "/stock-items",
        icon: Package,
        permission: PERMISSIONS.STOCK_ITEMS_READ,
      },
      {
        title: "Receptury",
        url: "/recipes",
        icon: ChefHat,
        permission: PERMISSIONS.RECIPES_READ,
      },
      {
        title: "Pohyby skladu",
        url: "/stock-movements",
        icon: ArrowUpDown,
        permission: PERMISSIONS.STOCK_MOVEMENTS_READ,
      },
      {
        title: "Požadavky skladu",
        url: "/stock-requirements",
        icon: ClipboardCheck,
        permission: PERMISSIONS.STOCK_ITEMS_READ,
      },
    ],
  },
  {
    title: "Partneři",
    icon: Users2,
    permissions: [
      PERMISSIONS.PARTNERS_READ,
      PERMISSIONS.VOUCHERS_READ,
      PERMISSIONS.COMMISSIONS_READ,
    ],
    items: [
      {
        title: "Partneři",
        url: "/partners",
        icon: Users2,
        permission: PERMISSIONS.PARTNERS_READ,
      },
      {
        title: "Vouchery",
        url: "/vouchers",
        icon: Ticket,
        permission: PERMISSIONS.VOUCHERS_READ,
      },
      {
        title: "Provizní logy",
        url: "/commission-logs",
        icon: DollarSign,
        permission: PERMISSIONS.COMMISSIONS_READ,
      },
    ],
  },
  {
    title: "Personál",
    icon: UserCog,
    permissions: [
      PERMISSIONS.STAFF_READ,
      PERMISSIONS.STAFF_ATTENDANCE_READ,
      PERMISSIONS.STAFFING_FORMULAS_READ,
    ],
    items: [
      {
        title: "Personál",
        url: "/staff",
        icon: UserCog,
        permission: PERMISSIONS.STAFF_READ,
      },
      {
        title: "Docházka",
        url: "/staff-attendance",
        icon: Clock,
        permission: PERMISSIONS.STAFF_ATTENDANCE_READ,
      },
      {
        title: "Výpočetní vzorce",
        url: "/staffing-formulas",
        icon: Calculator,
        permission: PERMISSIONS.STAFFING_FORMULAS_READ,
      },
    ],
  },
  {
    title: "Pokladna",
    url: "/cashbox",
    icon: Wallet,
    permission: PERMISSIONS.CASHBOX_READ,
  },
  {
    title: "Správa",
    icon: Settings,
    permissions: [PERMISSIONS.USERS_READ, PERMISSIONS.PERMISSIONS_READ, PERMISSIONS.RESERVATION_TYPES_READ, PERMISSIONS.CASHBOX_READ],
    items: [
      {
        title: "Uživatelé",
        url: "/users",
        icon: Users,
        permission: PERMISSIONS.USERS_READ,
      },
      {
        title: "Role",
        url: "/roles",
        icon: Shield,
        permission: PERMISSIONS.PERMISSIONS_READ,
      },
      {
        title: "Druhy rezervací",
        url: "/reservation-types",
        icon: Tag,
        permission: PERMISSIONS.RESERVATION_TYPES_READ,
      },
      {
        title: "Kategorie pokladny",
        url: "/cash-categories",
        icon: Wallet,
        permission: PERMISSIONS.CASHBOX_READ,
      },
      {
        title: "Nastavení firmy",
        url: "/settings",
        icon: Building2,
        permission: PERMISSIONS.USERS_READ,
      },
    ],
  },
  {
    title: "Blokované termíny",
    url: "/disabled-dates",
    icon: CalendarOff,
    permission: PERMISSIONS.DISABLED_DATES_READ,
  },
];
