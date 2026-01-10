import { useLocation } from "wouter";
import { useState } from "react";
import {
  Calendar,
  CreditCard,
  Home,
  Users,
  UtensilsCrossed,
  CalendarOff,
  LogOut,
  User,
  Package,
  ChefHat,
  ArrowUpDown,
  Users2,
  Ticket,
  DollarSign,
  UserCog,
  Clock,
  Wallet,
  CalendarDays,
  ChevronRight,
  LucideIcon,
  Calculator,
  Shield,
  Settings,
  FileText,
  Building2,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  useSidebar,
} from "@/shared/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/shared/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import { PERMISSIONS, useAuth } from "@modules/auth";

interface MenuItem {
  title: string;
  url?: string;
  icon: LucideIcon;
  permission?: string; // Required permission to see this item
  permissions?: string[]; // Any of these permissions
  items?: {
    title: string;
    url: string;
    icon: LucideIcon;
    permission?: string;
  }[];
}

const menuItems: MenuItem[] = [
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
    permissions: [PERMISSIONS.USERS_READ, PERMISSIONS.PERMISSIONS_READ],
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
        title: "Nastavení firmy",
        url: "/settings",
        icon: Building2,
        permission: PERMISSIONS.USERS_READ, // Pouze admin může měnit nastavení
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

export function AppSidebar() {
  const [location, setLocation] = useLocation();
  const { user, logout, hasPermission, hasAnyPermission, isSuperAdmin } =
    useAuth();
  const { state } = useSidebar();
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});

  const userInitials = user?.username?.slice(0, 2).toUpperCase() || "U";
  const isCollapsed = state === "collapsed";

  const toggleItem = (title: string) => {
    setOpenItems((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const isItemActive = (item: MenuItem) => {
    if (item.url) return location === item.url;
    if (item.items) {
      return item.items.some((subItem) => location === subItem.url);
    }
    return false;
  };

  // Filter menu items based on permissions
  const canAccessItem = (item: MenuItem): boolean => {
    if (isSuperAdmin) return true;
    if (item.permission) return hasPermission(item.permission);
    if (item.permissions) return hasAnyPermission(item.permissions);
    return true; // No permission specified = accessible
  };

  const canAccessSubItem = (subItem: { permission?: string }): boolean => {
    if (isSuperAdmin) return true;
    if (subItem.permission) return hasPermission(subItem.permission);
    return true;
  };

  // Filter items based on permissions
  const filteredMenuItems = menuItems
    .filter(canAccessItem)
    .map((item) => {
      if (item.items) {
        return {
          ...item,
          items: item.items.filter(canAccessSubItem),
        };
      }
      return item;
    })
    // Remove parent items with no accessible children
    .filter((item) => !item.items || item.items.length > 0);

  return (
    <Sidebar collapsible="icon" data-testid="sidebar-navigation">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-4 py-3">
          <div className="w-8 h-8 rounded-md bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white font-bold">
            FG
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="font-serif font-semibold text-sm">
                Folklore Garden
              </span>
              <span className="text-xs text-muted-foreground">Admin</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          {!isCollapsed && <SidebarGroupLabel>Navigace</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = isItemActive(item);

                // Item with sub-items
                if (item.items) {
                  const isOpen = openItems[item.title] ?? false;

                  if (isCollapsed) {
                    // When collapsed, show parent as dropdown in tooltip
                    return (
                      <SidebarMenuItem key={item.title}>
                        <DropdownMenu>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <DropdownMenuTrigger asChild>
                                <SidebarMenuButton isActive={isActive}>
                                  <Icon className="w-5 h-5" />
                                </SidebarMenuButton>
                              </DropdownMenuTrigger>
                            </TooltipTrigger>
                            <TooltipContent side="right">
                              {item.title}
                            </TooltipContent>
                          </Tooltip>
                          <DropdownMenuContent
                            side="right"
                            align="start"
                            className="w-48"
                          >
                            <DropdownMenuLabel>{item.title}</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {item.items.map((subItem) => {
                              const SubIcon = subItem.icon;
                              return (
                                <DropdownMenuItem
                                  key={subItem.url}
                                  onClick={() => setLocation(subItem.url)}
                                  data-testid={`link-${subItem.url.slice(1)}`}
                                >
                                  <SubIcon className="w-4 h-4 mr-2" />
                                  {subItem.title}
                                </DropdownMenuItem>
                              );
                            })}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </SidebarMenuItem>
                    );
                  }

                  // When expanded, show collapsible menu
                  return (
                    <Collapsible
                      key={item.title}
                      open={isOpen}
                      onOpenChange={() => toggleItem(item.title)}
                    >
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton isActive={isActive}>
                            <Icon className="w-5 h-5" />
                            <span>{item.title}</span>
                            <ChevronRight
                              className={`ml-auto w-4 h-4 transition-transform ${
                                isOpen ? "rotate-90" : ""
                              }`}
                            />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {item.items.map((subItem) => {
                              const SubIcon = subItem.icon;
                              const isSubActive = location === subItem.url;
                              return (
                                <SidebarMenuSubItem key={subItem.url}>
                                  <SidebarMenuSubButton
                                    isActive={isSubActive}
                                    onClick={() => setLocation(subItem.url)}
                                    data-testid={`link-${subItem.url.slice(1)}`}
                                  >
                                    <SubIcon className="w-4 h-4" />
                                    <span>{subItem.title}</span>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              );
                            })}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  );
                }

                // Simple item without sub-items
                if (isCollapsed) {
                  return (
                    <SidebarMenuItem key={item.title}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <SidebarMenuButton
                            isActive={isActive}
                            onClick={() => item.url && setLocation(item.url)}
                            data-testid={`link-${item.url === "/" ? "dashboard" : item.url!.slice(1)}`}
                          >
                            <Icon className="w-5 h-5" />
                          </SidebarMenuButton>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          {item.title}
                        </TooltipContent>
                      </Tooltip>
                    </SidebarMenuItem>
                  );
                }

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => item.url && setLocation(item.url)}
                      data-testid={`link-${item.url === "/" ? "dashboard" : item.url!.slice(1)}`}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            {isCollapsed ? (
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <div className="flex items-center justify-center px-2 py-2 rounded-md hover-elevate active-elevate-2 cursor-pointer">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                            {userInitials}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="right">{user?.username}</TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Můj účet</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setLocation("/profile")}
                    data-testid="menu-item-profile"
                  >
                    <User className="w-4 h-4 mr-2" />
                    Profil
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={logout}
                    data-testid="button-logout"
                    className="text-destructive focus:text-destructive"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Odhlásit se
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger className="w-full [&>*]:w-full">
                  <div
                    className="flex items-center gap-2 px-2 py-2 rounded-md hover-elevate active-elevate-2 cursor-pointer"
                    data-testid="button-user-menu"
                  >
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start overflow-hidden">
                      <span className="text-sm font-medium truncate">
                        {user?.username}
                      </span>
                      <span className="text-xs text-muted-foreground truncate">
                        {user?.email}
                      </span>
                    </div>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Můj účet</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setLocation("/profile")}
                    data-testid="menu-item-profile"
                  >
                    <User className="w-4 h-4 mr-2" />
                    Profil
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={logout}
                    data-testid="button-logout"
                    className="text-destructive focus:text-destructive"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Odhlásit se
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
