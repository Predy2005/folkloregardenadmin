import { useToggleSet } from '@/shared/hooks/useToggleSet';
import { Badge } from '@/shared/components/ui/badge';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { Permission } from '@shared/types';
import { PERMISSION_MODULE_LABELS, PERMISSION_ACTION_LABELS } from '@shared/types';

interface PermissionMatrixProps {
  permissionsGrouped: Record<string, Permission[]>;
  selectedPermissions: string[];
  onPermissionsChange: (permissions: string[]) => void;
  expandedModules: ReturnType<typeof useToggleSet<string>>;
}

function isModuleFullySelected(permissions: Permission[], selectedPerms: string[]) {
  return permissions.every(p => selectedPerms.includes(p.key));
}

function isModulePartiallySelected(permissions: Permission[], selectedPerms: string[]) {
  const selected = permissions.filter(p => selectedPerms.includes(p.key));
  return selected.length > 0 && selected.length < permissions.length;
}

function toggleAllModulePermissions(
  permissions: Permission[],
  currentPerms: string[],
  checked: boolean,
): string[] {
  const modulePermKeys = permissions.map(p => p.key);

  if (checked) {
    return Array.from(new Set([...currentPerms, ...modulePermKeys]));
  } else {
    return currentPerms.filter(p => !modulePermKeys.includes(p));
  }
}

export function PermissionMatrix({
  permissionsGrouped,
  selectedPermissions,
  onPermissionsChange,
  expandedModules,
}: PermissionMatrixProps) {
  return (
    <div className="border rounded-lg divide-y max-h-[400px] overflow-y-auto">
      {Object.entries(permissionsGrouped).map(([module, permissions]) => {
        const isExpanded = expandedModules.isOpen(module);
        const isFullySelected = isModuleFullySelected(permissions, selectedPermissions);
        const isPartiallySelected = isModulePartiallySelected(permissions, selectedPermissions);

        return (
          <div key={module}>
            <div
              className="flex items-center gap-3 p-3 bg-muted/30 hover:bg-muted/50 cursor-pointer"
              onClick={() => expandedModules.toggle(module)}
            >
              <div onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={isFullySelected}
                  className={isPartiallySelected ? 'data-[state=checked]:bg-primary/50' : ''}
                  onCheckedChange={(checked) => {
                    const newPerms = toggleAllModulePermissions(
                      permissions,
                      selectedPermissions,
                      !!checked,
                    );
                    onPermissionsChange(newPerms);
                  }}
                />
              </div>
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
              <span className="font-medium">
                {PERMISSION_MODULE_LABELS[module] || module}
              </span>
              <Badge variant="outline" className="ml-auto">
                {permissions.filter(p => selectedPermissions.includes(p.key)).length}/{permissions.length}
              </Badge>
            </div>

            {isExpanded && (
              <div className="p-3 pl-12 grid grid-cols-2 md:grid-cols-4 gap-2 bg-background">
                {permissions.map((permission) => (
                  <div key={permission.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`perm-${permission.id}`}
                      checked={selectedPermissions.includes(permission.key)}
                      onCheckedChange={(checked) => {
                        const newPerms = checked
                          ? [...selectedPermissions, permission.key]
                          : selectedPermissions.filter((p) => p !== permission.key);
                        onPermissionsChange(newPerms);
                      }}
                    />
                    <label
                      htmlFor={`perm-${permission.id}`}
                      className="text-sm cursor-pointer"
                      title={permission.description}
                    >
                      {PERMISSION_ACTION_LABELS[permission.action] || permission.action}
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
