import { useState } from "react";
import { useLocation, Link, useParams } from "wouter";
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
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";

const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, "Heslo musí mít alespoň 6 znaků"),
  confirmPassword: z.string().min(1, "Potvrďte heslo"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Hesla se neshodují",
  path: ["confirmPassword"],
});

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const [, setLocation] = useLocation();
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<"form" | "success" | "error">("form");
  const [errorMessage, setErrorMessage] = useState("");

  const form = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const onSubmit = async (data: ResetPasswordForm) => {
    try {
      setIsLoading(true);
      await api.post("/auth/reset-password", {
        resetToken: token,
        newPassword: data.newPassword,
      });
      setStatus("success");
    } catch (error: any) {
      const msg = error.response?.data?.error || "Nepodařilo se obnovit heslo";
      setErrorMessage(msg);
      setStatus("error");
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
            <h2 className="text-2xl font-bold text-[#21150C]">Nové heslo</h2>
            <img src="/logo.svg" alt="Folklore Garden" className="h-8" />
          </div>

          {status === "success" && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 border border-green-200">
                <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0" />
                <div>
                  <p className="font-medium text-green-800">Heslo bylo úspěšně změněno</p>
                  <p className="text-sm text-green-700 mt-1">
                    Nyní se můžete přihlásit s novým heslem.
                  </p>
                </div>
              </div>

              <Button
                onClick={() => setLocation("/login")}
                className="w-full h-11 text-white font-medium rounded-full"
                style={{ backgroundColor: '#DC1A15' }}
              >
                Přejít na přihlášení
              </Button>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-red-50 border border-red-200">
                <XCircle className="h-6 w-6 text-red-600 flex-shrink-0" />
                <div>
                  <p className="font-medium text-red-800">Chyba při obnovení hesla</p>
                  <p className="text-sm text-red-700 mt-1">{errorMessage}</p>
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={() => setStatus("form")}
                  variant="outline"
                  className="w-full h-11"
                >
                  Zkusit znovu
                </Button>

                <Link href="/forgot-password" className="flex items-center justify-center gap-2 text-sm text-[#DC1A15] hover:underline">
                  Vyžádat nový odkaz
                </Link>
              </div>
            </div>
          )}

          {status === "form" && (
            <>
              <p className="text-sm text-[#21150C]/60 -mt-4">
                Zadejte nové heslo pro svůj účet
              </p>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  <FormField
                    control={form.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[#21150C]/80 text-sm">Nové heslo</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Minimálně 6 znaků"
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
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[#21150C]/80 text-sm">Potvrzení hesla</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Zadejte heslo znovu"
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
                    {isLoading ? "Ukládání..." : "Nastavit nové heslo"}
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
