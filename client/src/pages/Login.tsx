import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { Checkbox } from "@/components/ui/checkbox";

const loginSchema = z.object({
  username: z.string().min(1, "Zadejte uživatelské jméno"),
  password: z.string().min(1, "Zadejte heslo"),
  rememberMe: z.boolean().optional(),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
      rememberMe: false,
    },
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      setIsLoading(true);
      await login({ username: data.username, password: data.password });
      setLocation("/");
    } catch (error) {
      console.error("Login error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Levá strana - Hero s purple gradient */}
      <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-primary via-purple-600 to-pink-500 p-12 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative z-10">
          <div className="w-12 h-12 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4">
            <span className="text-2xl font-bold">FG</span>
          </div>
        </div>

        <div className="relative z-10">
          <h1 className="text-4xl font-serif font-bold mb-4">
            Nejrychlejší a nejjednodušší způsob
          </h1>
          <p className="text-xl font-serif font-bold mb-6">
            Správa Folklore Garden
          </p>
          <p className="text-white/90 text-sm max-w-md">
            Kompletní administrační systém pro správu rezervací, plateb, akcí a
            personálu
          </p>
        </div>

        <div className="relative z-10 text-xs text-white/80">
          Version: 1.0.0.1
        </div>
      </div>

      {/* Pravá strana - Login form */}
      <div className="flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md space-y-6">
          <div className="text-right mb-6">
            <div className="inline-flex items-center gap-2 text-sm">
              <div className="w-8 h-8 rounded-md bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white font-bold">
                FG
              </div>
              <span className="font-semibold">Folklore Garden</span>
            </div>
          </div>

          <Card className="border-border">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-serif">Přihlášení</CardTitle>
              <CardDescription>Zadejte své přihlašovací údaje</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email / Uživatelské jméno</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="vas@email.cz"
                            data-testid="input-email"
                            {...field}
                          />
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
                        <FormLabel>Heslo</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Zadejte heslo"
                            data-testid="input-password"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex items-center justify-between">
                    <FormField
                      control={form.control}
                      name="rememberMe"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-remember"
                            />
                          </FormControl>
                          <FormLabel className="text-sm font-normal cursor-pointer">
                            Zapamatovat si mě
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                    <Link
                      href="/forgot-password"
                      className="text-sm text-primary hover:underline"
                    >
                      Zapomněli jste heslo?
                    </Link>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
                    disabled={isLoading}
                    data-testid="button-login"
                  >
                    {isLoading ? "Přihlašování..." : "Přihlásit se"}
                  </Button>
                </form>
              </Form>
            </CardContent>
            <CardFooter className="flex justify-center">
              <p className="text-sm text-muted-foreground">
                Nemáte účet?{" "}
                <Link
                  href="/register"
                  className="text-primary hover:underline font-medium"
                >
                  Zaregistrovat se
                </Link>
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
