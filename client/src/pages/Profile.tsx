import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { User, Shield, Mail, Lock } from 'lucide-react';

const profileSchema = z.object({
  username: z.string().min(3, 'Uživatelské jméno musí mít alespoň 3 znaky'),
  email: z.string().email('Zadejte platný email'),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6, 'Heslo musí mít alespoň 6 znaků').optional().or(z.literal('')),
  confirmPassword: z.string().optional().or(z.literal('')),
}).refine((data) => {
  if (data.newPassword && data.newPassword.length > 0 && !data.currentPassword) {
    return false;
  }
  return true;
}, {
  message: 'Pro změnu hesla zadejte současné heslo',
  path: ['currentPassword'],
}).refine((data) => {
  if (data.newPassword && data.newPassword.length > 0 && data.newPassword !== data.confirmPassword) {
    return false;
  }
  return true;
}, {
  message: 'Hesla se neshodují',
  path: ['confirmPassword'],
});

type ProfileForm = z.infer<typeof profileSchema>;

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();

  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: user?.username || '',
      email: user?.email || '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<ProfileForm>) => api.put('/auth/profile', data),
    onSuccess: () => {
      refreshUser();
      form.reset({
        username: form.getValues('username'),
        email: form.getValues('email'),
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      toast({ title: 'Profil byl úspěšně aktualizován' });
    },
    onError: (error: any) => {
      toast({
        title: 'Chyba při aktualizaci profilu',
        description: error.response?.data?.message || 'Nepodařilo se aktualizovat profil',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: ProfileForm) => {
    const updateData: any = {
      username: data.username,
      email: data.email,
    };

    if (data.newPassword && data.currentPassword) {
      updateData.currentPassword = data.currentPassword;
      updateData.newPassword = data.newPassword;
    }

    updateMutation.mutate(updateData);
  };

  if (!user) {
    return null;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-serif font-bold mb-2">Můj profil</h1>
        <p className="text-muted-foreground">Upravte své osobní údaje a heslo</p>
      </div>

      {/* User Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="w-5 h-5" />
            Informace o účtu
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">ID uživatele</p>
              <p className="font-mono text-sm">#{user.id}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Role</p>
              <div className="flex gap-1 mt-1">
                {user.roles?.map((role) => (
                  <Badge key={role} variant="outline">
                    <Shield className="w-3 h-3 mr-1" />
                    {role.replace('ROLE_', '')}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Profile Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Upravit profil</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Uživatelské jméno
                    </FormLabel>
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
                    <FormLabel className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Email
                    </FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="uzivatel@email.cz" data-testid="input-email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="pt-4 border-t">
                <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Změna hesla (volitelné)
                </h3>

                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Současné heslo</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Zadejte současné heslo"
                            data-testid="input-current-password"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nové heslo</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Zadejte nové heslo"
                            data-testid="input-new-password"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Potvrzení nového hesla</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Zadejte nové heslo znovu"
                            data-testid="input-confirm-password"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => form.reset()}
                  data-testid="button-reset"
                >
                  Obnovit
                </Button>
                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                  data-testid="button-save-profile"
                  className="bg-gradient-to-r from-primary to-purple-600"
                >
                  {updateMutation.isPending ? 'Ukládání...' : 'Uložit změny'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
