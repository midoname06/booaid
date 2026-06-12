"use client";
import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Wand2, Mail, Lock, Loader2, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [unconfirmed, setUnconfirmed] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendDone, setResendDone] = useState(false);

  useEffect(() => {
    if (searchParams.get("error") === "auth") {
      setError("Link di autenticazione non valido o scaduto. Riprova ad accedere.");
    }
  }, [searchParams]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setUnconfirmed(false);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.message === "Email not confirmed") {
        setUnconfirmed(true);
      } else {
        setError("Email o password non corretti.");
      }
      setLoading(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  async function handleResend() {
    setResendLoading(true);
    const supabase = createClient();
    await supabase.auth.resend({ type: "signup", email });
    setResendLoading(false);
    setResendDone(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "var(--bg)" }}>
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 justify-center mb-10">
          <div className="w-10 h-10 rounded-xl grid place-items-center text-white"
            style={{ background: "linear-gradient(135deg,var(--primary),var(--accent))" }}>
            <Wand2 size={20} />
          </div>
          <span className="text-xl font-bold tracking-tight">Wafiq Agents</span>
        </div>

        <div className="rounded-2xl p-7 border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <h1 className="text-xl font-semibold mb-1">Accedi</h1>
          <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>Bentornato nel pannello di controllo.</p>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium" style={{ color: "var(--muted)" }}>Email</span>
              <div className="flex items-center gap-2 border rounded-xl px-3 py-2.5"
                style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
                <Mail size={15} style={{ color: "var(--muted)" }} />
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="tu@esempio.com"
                  className="flex-1 bg-transparent text-sm outline-none"
                  style={{ color: "var(--text)" }} />
              </div>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium" style={{ color: "var(--muted)" }}>Password</span>
              <div className="flex items-center gap-2 border rounded-xl px-3 py-2.5"
                style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
                <Lock size={15} style={{ color: "var(--muted)" }} />
                <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="flex-1 bg-transparent text-sm outline-none"
                  style={{ color: "var(--text)" }} />
              </div>
            </label>

            {error && (
              <p className="text-xs px-3 py-2 rounded-xl"
                style={{ background: "rgba(239,68,68,.12)", color: "var(--danger)" }}>{error}</p>
            )}

            {unconfirmed && (
              <div className="rounded-xl px-3 py-3 flex flex-col gap-2"
                style={{ background: "rgba(245,158,11,.1)", border: "1px solid rgba(245,158,11,.25)" }}>
                <div className="flex items-start gap-2">
                  <AlertCircle size={14} className="mt-0.5 shrink-0" style={{ color: "var(--warning)" }} />
                  <p className="text-xs leading-relaxed" style={{ color: "var(--warning)" }}>
                    Email non ancora confermata. Controlla la tua casella di posta (anche lo spam).
                  </p>
                </div>
                {resendDone ? (
                  <p className="text-xs pl-5" style={{ color: "var(--success)" }}>Email inviata di nuovo!</p>
                ) : (
                  <button type="button" onClick={handleResend} disabled={resendLoading}
                    className="text-xs pl-5 text-left underline underline-offset-2 disabled:opacity-50"
                    style={{ color: "var(--warning)" }}>
                    {resendLoading ? "Invio..." : "Invia di nuovo la email di conferma"}
                  </button>
                )}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-sm text-white mt-1 disabled:opacity-60"
              style={{ background: "linear-gradient(135deg,var(--primary),var(--accent))" }}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              {loading ? "Accesso in corso..." : "Accedi"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm mt-5" style={{ color: "var(--muted)" }}>
          Non hai un account?{" "}
          <Link href="/signup" className="font-medium" style={{ color: "var(--primary)" }}>Registrati</Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
