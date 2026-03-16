import { useState } from "react";
import { useLocation } from "wouter";
import { ChevronRight } from "lucide-react";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/shared/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
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
import type { MenuItem } from "./sidebarNav";

interface SidebarNavMenuProps {
  items: MenuItem[];
  isCollapsed: boolean;
}

export function SidebarNavMenu({ items, isCollapsed }: SidebarNavMenuProps) {
  const [location, setLocation] = useLocation();
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});

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
    <SidebarGroup>
      {!isCollapsed && <SidebarGroupLabel>Navigace</SidebarGroupLabel>}
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = isItemActive(item);

            // Item with sub-items
            if (item.items) {
              const isOpen = openItems[item.title] ?? false;

              if (isCollapsed) {
                return (
                  <CollapsedGroupItem
                    key={item.title}
                    item={item}
                    isActive={isActive}
                    onNavigate={setLocation}
                  />
                );
              }

              return (
                <ExpandedGroupItem
                  key={item.title}
                  item={item}
                  isActive={isActive}
                  isOpen={isOpen}
                  onToggle={() => toggleItem(item.title)}
                  location={location}
                  onNavigate={setLocation}
                />
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
  );
}

// --- Internal sub-components ---

interface CollapsedGroupItemProps {
  item: MenuItem;
  isActive: boolean;
  onNavigate: (url: string) => void;
}

function CollapsedGroupItem({
  item,
  isActive,
  onNavigate,
}: CollapsedGroupItemProps) {
  const Icon = item.icon;
  return (
    <SidebarMenuItem>
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
          {item.items!.map((subItem) => {
            const SubIcon = subItem.icon;
            return (
              <DropdownMenuItem
                key={subItem.url}
                onClick={() => onNavigate(subItem.url)}
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

interface ExpandedGroupItemProps {
  item: MenuItem;
  isActive: boolean;
  isOpen: boolean;
  onToggle: () => void;
  location: string;
  onNavigate: (url: string) => void;
}

function ExpandedGroupItem({
  item,
  isActive,
  isOpen,
  onToggle,
  location,
  onNavigate,
}: ExpandedGroupItemProps) {
  const Icon = item.icon;
  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
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
            {item.items!.map((subItem) => {
              const SubIcon = subItem.icon;
              const isSubActive = location === subItem.url;
              return (
                <SidebarMenuSubItem key={subItem.url}>
                  <SidebarMenuSubButton
                    isActive={isSubActive}
                    onClick={() => onNavigate(subItem.url)}
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
