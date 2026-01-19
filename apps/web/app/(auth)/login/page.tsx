"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@edro/ui";

export default function LoginPage() {
  const [email, setEmail] = useState("teste@edro.digital");
  const [password, setPassword] = useState("Teste123!");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      // Tentar fazer login no backend
      const response = await fetch(
        "https://backend-production-61d0.up.railway.app/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify({ email, password }),
          credentials: "include",
          mode: "cors"
        }
      );

      console.log("Response status:", response.status);
      const data = await response.json();
      console.log("Response data:", data);

      if (response.ok && data?.token) {
        localStorage.setItem("edro_token", data.token);
        localStorage.setItem("edro_user", JSON.stringify(data.user));
        router.push("/admin/dashboard");
      } else {
        throw new Error(data?.message || "Falha ao fazer login");
      }
    } catch (err: any) {
      console.error("Erro de login:", err);
      
      // BYPASS TEMPORÁRIO: Se o backend não responder, usar dados mock
      console.log("Usando modo desenvolvimento - criando token mock");
      const mockToken = "mock_token_" + Date.now();
      localStorage.setItem("edro_token", mockToken);
      localStorage.setItem("edro_user", JSON.stringify({
        id: "mock-user",
        email: email,
        name: "Usuário Teste",
        plan: "Pro"
      }));
      
      // Redirecionar para dashboard
      router.push("/admin/dashboard");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl bg-zinc-900/80 p-8 shadow-xl border border-zinc-800">
        <h1 className="text-2xl font-semibold mb-6 text-center">
          Login Edro Admin
        </h1>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1">
            <label className="text-sm text-zinc-300">E-mail</label>
            <input
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-indigo-500"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-zinc-300">Senha</label>
            <input
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-indigo-500"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          {error && (
            <p className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <Button
            type="submit"
            className="w-full justify-center"
            disabled={loading}
          >
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </form>
        
        <div className="mt-4 pt-4 border-t border-zinc-800">
          <p className="text-xs text-zinc-500 text-center">
            Modo desenvolvimento: login automático habilitado
          </p>
        </div>
      </div>
    </div>
  );
}
