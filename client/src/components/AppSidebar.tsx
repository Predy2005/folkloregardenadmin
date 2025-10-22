import { useLocation } from 'wouter';
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

const menuItems = [
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
    title: 'Sklad',
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

  const userInitials = user?.username?.slice(0, 2).toUpperCase() || 'U';

  return (
    <Sidebar data-testid="sidebar-navigation">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-4 py-3">
          <div className="w-8 h-8 rounded-md bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white font-bold">
            FG
          </div>
          <div className="flex flex-col">
            <span className="font-serif font-semibold text-sm">Folklore Garden</span>
            <span className="text-xs text-muted-foreground">Admin</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = location === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      data-testid={`link-${item.url === '/' ? 'dashboard' : item.url.slice(1)}`}
                    >
                      <a href={item.url} onClick={(e) => {
                        e.preventDefault();
                        setLocation(item.url);
                      }}>
                        <item.icon className="w-5 h-5" />
                        <span>{item.title}</span>
                      </a>
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="hover-elevate" data-testid="button-user-menu">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start overflow-hidden">
                    <span className="text-sm font-medium truncate">{user?.username}</span>
                    <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Můj účet</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem data-testid="menu-item-profile">
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
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
