import { useLocation } from 'wouter';
import { useState } from 'react';
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
} from 'lucide-react';
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
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface MenuItem {
  title: string;
  url?: string;
  icon: LucideIcon;
  items?: {
    title: string;
    url: string;
    icon: LucideIcon;
  }[];
}

const menuItems: MenuItem[] = [
  {
    title: 'Dashboard',
    url: '/',
    icon: Home,
  },
  {
    title: 'Rezervace',
    url: '/reservations',
    icon: Calendar,
  },
  {
    title: 'Platby',
    url: '/payments',
    icon: CreditCard,
  },
  {
    title: 'Jídla',
    url: '/foods',
    icon: UtensilsCrossed,
  },
  {
    title: 'Cenník',
    url: '/pricing',
    icon: DollarSign,
  },
  {
    title: 'Ceník jídel',
    url: '/food-pricing',
    icon: UtensilsCrossed,
  },
  {
    title: 'Sklad',
    icon: Package,
    items: [
      {
        title: 'Položky skladu',
        url: '/stock-items',
        icon: Package,
      },
      {
        title: 'Receptury',
        url: '/recipes',
        icon: ChefHat,
      },
      {
        title: 'Pohyby skladu',
        url: '/stock-movements',
        icon: ArrowUpDown,
      },
    ],
  },
  {
    title: 'Partneři',
    icon: Users2,
    items: [
      {
        title: 'Partneři',
        url: '/partners',
        icon: Users2,
      },
      {
        title: 'Vouchery',
        url: '/vouchers',
        icon: Ticket,
      },
      {
        title: 'Provizní logy',
        url: '/commission-logs',
        icon: DollarSign,
      },
    ],
  },
  {
    title: 'Personál',
    icon: UserCog,
    items: [
      {
        title: 'Personál',
        url: '/staff',
        icon: UserCog,
      },
      {
        title: 'Docházka',
        url: '/staff-attendance',
        icon: Clock,
      },
    ],
  },
  {
    title: 'Pokladna',
    url: '/cashbox',
    icon: Wallet,
  },
  {
    title: 'Akce',
    url: '/events',
    icon: CalendarDays,
  },
  {
    title: 'Uživatelé',
    url: '/users',
    icon: Users,
  },
  {
    title: 'Blokované termíny',
    url: '/disabled-dates',
    icon: CalendarOff,
  },
];

export function AppSidebar() {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const { state } = useSidebar();
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});

  const userInitials = user?.username?.slice(0, 2).toUpperCase() || 'U';
  const isCollapsed = state === 'collapsed';

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

  return (
    <Sidebar collapsible="icon" data-testid="sidebar-navigation">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-4 py-3">
          <div className="w-8 h-8 rounded-md bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white font-bold">
            FG
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="font-serif font-semibold text-sm">Folklore Garden</span>
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
              {menuItems.map((item) => {
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
                            <TooltipContent side="right">{item.title}</TooltipContent>
                          </Tooltip>
                          <DropdownMenuContent side="right" align="start" className="w-48">
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
                                isOpen ? 'rotate-90' : ''
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
                            data-testid={`link-${item.url === '/' ? 'dashboard' : item.url!.slice(1)}`}
                          >
                            <Icon className="w-5 h-5" />
                          </SidebarMenuButton>
                        </TooltipTrigger>
                        <TooltipContent side="right">{item.title}</TooltipContent>
                      </Tooltip>
                    </SidebarMenuItem>
                  );
                }

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => item.url && setLocation(item.url)}
                      data-testid={`link-${item.url === '/' ? 'dashboard' : item.url!.slice(1)}`}
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
                  <DropdownMenuItem onClick={() => setLocation('/profile')} data-testid="menu-item-profile">
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
                  <div className="flex items-center gap-2 px-2 py-2 rounded-md hover-elevate active-elevate-2 cursor-pointer" data-testid="button-user-menu">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start overflow-hidden">
                      <span className="text-sm font-medium truncate">{user?.username}</span>
                      <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
                    </div>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Můj účet</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setLocation('/profile')} data-testid="menu-item-profile">
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
