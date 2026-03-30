"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  };

  return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="text-6xl">🌍</div>
          <h1 className="text-white text-3xl font-black">Artificial Voices</h1>
          <p className="text-white/40 text-sm">Sign in to continue learning</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <label className="text-white/60 text-xs uppercase tracking-wider">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="w-full bg-white/8 border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder-white/20 outline-none focus:border-white/30 transition text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-white/60 text-xs uppercase tracking-wider">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full bg-white/8 border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder-white/20 outline-none focus:border-white/30 transition text-sm"
            />
          </div>

          {error && (
            <div className="bg-red-500/15 border border-red-500/30 rounded-2xl px-4 py-3">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black font-bold py-4 rounded-2xl text-base active:scale-98 transition disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p className="text-center text-white/40 text-sm">
          No account?{" "}
          <Link href="/signup" className="text-white font-semibold underline underline-offset-2">
            Create one
          </Link>
        </p>
      </div>
    </main>
  );
}
