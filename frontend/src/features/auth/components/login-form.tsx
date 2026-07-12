"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { GoogleLogin } from "@react-oauth/google";
import { isAxiosError } from "axios";

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
import { googleLogin, login } from "@/services/auth.service";
import { useAuthStore } from "@/stores/auth.store";

const loginSchema = z.object({
  email: z.string().email("Email tidak valid"),
  password: z.string().min(1, "Password wajib diisi"),
});

type LoginValues = z.infer<typeof loginSchema>;

function extractErrorMessage(error: unknown, fallback: string) {
  if (isAxiosError(error) && error.response?.data?.message) {
    return error.response.data.message as string;
  }
  return fallback;
}

export function LoginForm() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: LoginValues) => {
    try {
      const result = await login(values);
      setAuth(result.token, result.admin);
      toast.success("Login berhasil.");
      router.push("/dashboard");
    } catch (error) {
      toast.error(extractErrorMessage(error, "Email atau password salah."));
    }
  };

  const handleGoogleSuccess = async (credential: string | undefined) => {
    if (!credential) return;
    setIsGoogleLoading(true);
    try {
      const result = await googleLogin({ idToken: credential });
      setAuth(result.token, result.admin);
      toast.success("Login Google berhasil.");
      router.push("/dashboard");
    } catch (error) {
      toast.error(extractErrorMessage(error, "Login Google gagal."));
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel required>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="nama@contoh.com" {...field} />
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
                <FormLabel required>Password</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="********" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type="submit"
            className="w-full"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? "Memproses..." : "Masuk"}
          </Button>
        </form>
      </Form>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">atau</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <div className="flex justify-center">
        {isGoogleLoading ? (
          <Button variant="outline" className="w-full" disabled>
            Memproses login Google...
          </Button>
        ) : (
          <GoogleLogin
            onSuccess={(response) => handleGoogleSuccess(response.credential)}
            onError={() => toast.error("Login Google gagal.")}
            width="320"
          />
        )}
      </div>
    </div>
  );
}
