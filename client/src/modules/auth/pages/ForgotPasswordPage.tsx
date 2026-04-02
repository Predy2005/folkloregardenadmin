import { useState } from "react";
import { Link } from "wouter";
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
import { api } from "@/shared/lib/api";
import { ArrowLeft, Mail, CheckCircle2 } from "lucide-react";

const forgotPasswordSchema = z.object({
  email: z.string().email("Zadejte platný e-mail"),
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const form = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data: ForgotPasswordForm) => {
    try {
      setIsLoading(true);
      await api.post("/auth/forgot-password", { email: data.email });
      setIsSent(true);
    } catch {
      // Always show success to prevent user enumeration
      setIsSent(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Levá strana */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-white relative">
        <div>
          <img src="/logo.svg" alt="Folklore Garden" className="h-10" />
        </div>
        <div className="flex-1 flex flex-col justify-center max-w-xl">
          <h1 className="font-bold text-[#21150C] mb-4 leading-tight" style={{ fontSize: '50px' }}>
            CRM Folklore Garden
          </h1>
          <p className="text-sm text-[#21150C]/70">
            Kompletní administrační systém pro
            <br />
            správu rezervací, plateb, akcí a personálu
          </p>
          <div className="mt-10 overflow-hidden">
            <img src="/pattern.svg" alt="" className="w-full max-w-sm h-auto" aria-hidden="true" />
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-[#21150C]/60">
          <span>Version 10.01</span>
          <span className="text-[#DC1A15] font-medium">Podpora +420 123 456 789</span>
        </div>
      </div>

      {/* Pravá strana */}
      <div className="flex items-center justify-center p-6" style={{ backgroundColor: '#F7EFE8' }}>
        <div className="w-full max-w-md space-y-8">
          <div className="flex items-start justify-between">
            <h2 className="text-2xl font-bold text-[#21150C]">Obnovení hesla</h2>
            <img src="/logo.svg" alt="Folklore Garden" className="h-8" />
          </div>

          {isSent ? (
            <div className="space-y-6">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 border border-green-200">
                <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0" />
                <div>
                  <p className="font-medium text-green-800">E-mail odeslán</p>
                  <p className="text-sm text-green-700 mt-1">
                    Pokud zadaný e-mail existuje v systému, obdržíte odkaz pro obnovení hesla. Zkontrolujte svou e-mailovou schránku.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={() => { setIsSent(false); form.reset(); }}
                  variant="outline"
                  className="w-full h-11"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Odeslat znovu
                </Button>

                <Link href="/login" className="flex items-center justify-center gap-2 text-sm text-[#DC1A15] hover:underline">
                  <ArrowLeft className="h-4 w-4" />
                  Zpět na přihlášení
                </Link>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm text-[#21150C]/60 -mt-4">
                Zadejte svůj e-mail a my vám pošleme odkaz pro obnovení hesla
              </p>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[#21150C]/80 text-sm">E-mail</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="vas@email.cz"
                            className="bg-white border-[#21150C]/10 h-11"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full h-11 text-white font-medium rounded-full"
                    style={{ backgroundColor: '#DC1A15' }}
                    disabled={isLoading}
                  >
                    {isLoading ? "Odesílání..." : "Odeslat odkaz pro obnovení"}
                  </Button>
                </form>
              </Form>

              <Link href="/login" className="flex items-center justify-center gap-2 text-sm text-[#DC1A15] hover:underline">
                <ArrowLeft className="h-4 w-4" />
                Zpět na přihlášení
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
