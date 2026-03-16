import { useLocation } from "wouter";
import { LogOut, User } from "lucide-react";
import {
  SidebarMenu,
  SidebarMenuItem,
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";

interface UserInfo {
  username?: string;
  email?: string;
}

interface SidebarUserMenuProps {
  user: UserInfo | null;
  isCollapsed: boolean;
  onLogout: () => void;
}

export function SidebarUserMenu({
  user,
  isCollapsed,
  onLogout,
}: SidebarUserMenuProps) {
  const [, setLocation] = useLocation();
  const userInitials = user?.username?.slice(0, 2).toUpperCase() || "U";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        {isCollapsed ? (
          <CollapsedUserMenu
            user={user}
            userInitials={userInitials}
            onLogout={onLogout}
            onNavigate={setLocation}
          />
        ) : (
          <ExpandedUserMenu
            user={user}
            userInitials={userInitials}
            onLogout={onLogout}
            onNavigate={setLocation}
          />
        )}
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

// --- Internal sub-components ---

interface UserMenuDropdownProps {
  user: UserInfo | null;
  userInitials: string;
  onLogout: () => void;
  onNavigate: (url: string) => void;
}

function UserMenuDropdownItems({
  onLogout,
  onNavigate,
}: Pick<UserMenuDropdownProps, "onLogout" | "onNavigate">) {
  return (
    <DropdownMenuContent align="end" className="w-56">
      <DropdownMenuLabel>Můj účet</DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        onClick={() => onNavigate("/profile")}
        data-testid="menu-item-profile"
      >
        <User className="w-4 h-4 mr-2" />
        Profil
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        onClick={onLogout}
        data-testid="button-logout"
        className="text-destructive focus:text-destructive"
      >
        <LogOut className="w-4 h-4 mr-2" />
        Odhlásit se
      </DropdownMenuItem>
    </DropdownMenuContent>
  );
}

function CollapsedUserMenu({
  user,
  userInitials,
  onLogout,
  onNavigate,
}: UserMenuDropdownProps) {
  return (
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
      <UserMenuDropdownItems onLogout={onLogout} onNavigate={onNavigate} />
    </DropdownMenu>
  );
}

function ExpandedUserMenu({
  user,
  userInitials,
  onLogout,
  onNavigate,
}: UserMenuDropdownProps) {
  return (
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
      <UserMenuDropdownItems onLogout={onLogout} onNavigate={onNavigate} />
    </DropdownMenu>
  );
}
