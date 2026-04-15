import { UseFormReturn } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/shared/components/ui/form';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Lock } from 'lucide-react';
import type { User, Role } from '@shared/types';

interface UserFormData {
  username: string;
  email: string;
  password?: string;
  roleIds: number[];
}

interface UserFormDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  editingItem: User | null;
  isEditing: boolean;
  form: UseFormReturn<UserFormData>;
  roles: Role[] | undefined;
  onSubmit: (data: UserFormData) => void;
  onClose: () => void;
  isPending: boolean;
}

export function UserFormDialog({
  isOpen,
  setIsOpen,
  editingItem,
  isEditing,
  form,
  roles,
  onSubmit,
  onClose,
  isPending,
}: UserFormDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif">
            {editingItem ? `Upravit uživatele: ${editingItem.username}` : 'Nový uživatel'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Uživatelské jméno</FormLabel>
                  <FormControl>
                    <Input placeholder="uzivatel123" data-testid="input-username" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="uzivatel@email.cz" data-testid="input-email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Heslo {editingItem && '(ponechte prázdné pro zachování)'}</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder={editingItem ? 'Nové heslo...' : 'Heslo'}
                      data-testid="input-password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="roleIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <div className="border rounded-lg p-3 space-y-2 max-h-[200px] overflow-y-auto">
                    {roles?.sort((a, b) => b.priority - a.priority).map((role) => {
                      const isSelected = field.value?.includes(role.id);
                      const isSuperAdminRole = role.name === 'SUPER_ADMIN';

                      return (
                        <div key={role.id} className="flex items-start space-x-3 py-1">
                          <Checkbox
                            id={`role-${role.id}`}
                            checked={isSelected}
                            disabled={isSuperAdminRole}
                            onCheckedChange={(checked) => {
                              const newRoleIds = checked
                                ? [...(field.value || []), role.id]
                                : field.value?.filter((id) => id !== role.id) || [];
                              field.onChange(newRoleIds);
                            }}
                            data-testid={`checkbox-role-${role.id}`}
                          />
                          <div className="flex-1 min-w-0">
                            <label
                              htmlFor={`role-${role.id}`}
                              className={`text-sm font-medium cursor-pointer flex items-center gap-2 ${isSuperAdminRole ? 'text-muted-foreground' : ''}`}
                            >
                              {role.isSystem && <Lock className="w-3 h-3" />}
                              {role.displayName || role.name}
                            </label>
                            {role.description && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                {role.description}
                              </p>
                            )}
                          </div>
                          <Badge variant="secondary" className="text-xs shrink-0">
                            {role.priority}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                  <FormDescription>
                    Vyberte role pro uživatele. Role určují oprávnění.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {editingItem?.isSuperAdmin && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  <Lock className="w-4 h-4 inline mr-2" />
                  Tento uživatel je super administrátor. Některé změny mohou být omezené.
                </p>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
              >
                Zrušit
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                data-testid="button-save-user"
                className="bg-primary hover:bg-primary/90"
              >
                {isPending
                  ? 'Ukládání...'
                  : isEditing
                  ? 'Uložit změny'
                  : 'Vytvořit'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
