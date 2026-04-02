interface SidebarBrandingProps {
  isCollapsed: boolean;
}

export function SidebarBranding({ isCollapsed }: SidebarBrandingProps) {
  return (
    <div className="flex items-center gap-2 px-2 py-3">
      {!isCollapsed ? (
        <img src="/logo.svg" alt="Folklore Garden" className="h-8 w-auto" />
      ) : (
        <img src="/logosmall.svg" alt="Folklore Garden" className="h-8 w-auto" />
      )}
    </div>
  );
}
