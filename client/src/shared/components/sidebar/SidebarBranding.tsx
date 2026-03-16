interface SidebarBrandingProps {
  isCollapsed: boolean;
}

export function SidebarBranding({ isCollapsed }: SidebarBrandingProps) {
  return (
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
  );
}
