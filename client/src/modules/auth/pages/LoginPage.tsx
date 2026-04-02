import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import { useAuth } from "@modules/auth";
import { Checkbox } from "@/shared/components/ui/checkbox";

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
      await login({ username: data.username, password: data.password, rememberMe: data.rememberMe });
      setLocation("/");
    } catch (error) {
      console.error("Login error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Levá strana - Bílé pozadí s logem, textem a patternem */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-white relative">
        {/* Logo */}
        <div>
          <img src="/logo.svg" alt="Folklore Garden" className="h-10" />
        </div>

        {/* Hlavní text */}
        <div className="flex-1 flex flex-col justify-center max-w-xl">
          <h1 className="font-bold text-[#21150C] mb-4 leading-tight" style={{ fontSize: '50px' }}>
            CRM Folklore Garden
          </h1>
          <p className="text-sm text-[#21150C]/70">
            Kompletní administrační systém pro
            <br />
            správu rezervací, plateb, akcí a personálu
          </p>

          {/* Pattern */}
          <div className="mt-10 overflow-hidden">
            <img
              src="/pattern.svg"
              alt=""
              className="w-full max-w-sm h-auto"
              aria-hidden="true"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-[#21150C]/60">
          <span>Version 10.01</span>
          <span className="text-[#DC1A15] font-medium">
            Podpora +420 123 456 789
          </span>
        </div>
      </div>

      {/* Pravá strana - Login form na krémovém pozadí */}
      <div className="flex items-center justify-center p-6" style={{ backgroundColor: '#F7EFE8' }}>
        <div className="w-full max-w-md space-y-8">
          {/* Nadpis s logem */}
          <div className="flex items-start justify-between">
            <h2 className="text-2xl font-bold text-[#21150C]">Přihlášení</h2>
            <img src="/logo.svg" alt="Folklore Garden" className="h-8" />
          </div>

          {/* Popis */}
          <p className="text-sm text-[#21150C]/60 -mt-4">
            Zadejte své přihlašovací údaje
          </p>

          {/* Formulář */}
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-5"
            >
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#21150C]/80 text-sm">
                      E-mail / Uživatelské jméno
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="admin@folkloregarden.cz"
                        data-testid="input-email"
                        className="bg-white border-[#21150C]/10 h-11"
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
                    <FormLabel className="text-[#21150C]/80 text-sm">
                      Heslo
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Zadejte heslo"
                        data-testid="input-password"
                        className="bg-white border-[#21150C]/10 h-11"
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
                      <FormLabel className="text-sm font-normal cursor-pointer text-[#21150C]/70">
                        Zapamatovat si mě
                      </FormLabel>
                    </FormItem>
                  )}
                />
                <Link
                  href="/forgot-password"
                  className="text-sm text-[#DC1A15] hover:underline"
                >
                  Zapomněli jste heslo?
                </Link>
              </div>

              <Button
                type="submit"
                className="w-full h-11 text-white font-medium rounded-full"
                style={{ backgroundColor: '#DC1A15' }}
                disabled={isLoading}
                data-testid="button-login"
              >
                {isLoading ? "Přihlašování..." : "Přihlásit se"}
              </Button>
            </form>
          </Form>

          <p className="text-sm text-center text-[#21150C]/60">
            Nemáte účet?{" "}
            <Link
              href="/register"
              className="text-[#0E7834] hover:underline font-medium"
            >
              Zaregistrovat se.
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
