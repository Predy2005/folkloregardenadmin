import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/shared/components/ui/sidebar";
import { useAuth } from "@modules/auth";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import {
  SidebarBranding,
  SidebarNavMenu,
  SidebarUserMenu,
  menuItems,
} from "./sidebar";
import type { MenuItem } from "./sidebar";

export function AppSidebar() {
  const { user, logout, hasPermission, hasAnyPermission, isSuperAdmin } =
    useAuth();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  const { data: hiddenStatus } = useQuery<{ hidden: boolean }>({
    queryKey: ["/api/cashbox/main/hidden-status"],
    queryFn: () => api.get<{ hidden: boolean }>("/api/cashbox/main/hidden-status").catch(() => ({ hidden: false })),
    staleTime: 30_000,
  });

  // Filter menu items based on permissions
  const canAccessItem = (item: MenuItem): boolean => {
    if (isSuperAdmin) return true;
    if (item.permission) return hasPermission(item.permission);
    if (item.permissions) return hasAnyPermission(item.permissions);
    return true;
  };

  const canAccessSubItem = (subItem: { permission?: string }): boolean => {
    if (isSuperAdmin) return true;
    if (subItem.permission) return hasPermission(subItem.permission);
    return true;
  };

  const mainCashboxHidden = hiddenStatus?.hidden && !isSuperAdmin;

  const filteredMenuItems = menuItems
    .filter(canAccessItem)
    .filter((item) => !(mainCashboxHidden && item.url === "/cashbox"))
    .map((item) => {
      if (item.items) {
        return {
          ...item,
          items: item.items.filter(canAccessSubItem),
        };
      }
      return item;
    })
    .filter((item) => !item.items || item.items.length > 0);

  return (
    <Sidebar collapsible="icon" data-testid="sidebar-navigation">
      <SidebarHeader>
        <SidebarBranding isCollapsed={isCollapsed} />
      </SidebarHeader>

      <SidebarContent>
        <SidebarNavMenu items={filteredMenuItems} isCollapsed={isCollapsed} />
      </SidebarContent>

      <SidebarFooter>
        <SidebarUserMenu
          user={user}
          isCollapsed={isCollapsed}
          onLogout={logout}
        />
      </SidebarFooter>
    </Sidebar>
  );
}
