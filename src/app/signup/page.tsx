"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Wand2, Mail, Lock, User, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: name } },
    });
    if (error) { setError(error.message); setLoading(false); return; }
    setDone(true);
    setLoading(false);
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--bg)" }}>
        <div className="w-full max-w-sm text-center">
          <div className="w-14 h-14 rounded-2xl grid place-items-center mx-auto mb-4"
            style={{ background: "rgba(34,197,94,.12)" }}>
            <span style={{ color: "var(--success)", fontSize: 28 }}>✓</span>
          </div>
          <h2 className="text-xl font-semibold mb-2">Controlla la tua email</h2>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Abbiamo inviato un link di conferma a <strong>{email}</strong>.
            Clicca il link per attivare l'account.
          </p>
          <Link href="/login"
            className="inline-block mt-6 text-sm font-medium"
            style={{ color: "var(--primary)" }}>← Torna al login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--bg)" }}>
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 justify-center mb-10">
          <div className="w-10 h-10 rounded-xl grid place-items-center text-white"
            style={{ background: "linear-gradient(135deg,var(--primary),var(--accent))" }}>
            <Wand2 size={20} />
          </div>
          <span className="text-xl font-bold tracking-tight">Wafiq Agents</span>
        </div>

        <div className="rounded-2xl p-7 border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <h1 className="text-xl font-semibold mb-1">Crea account</h1>
          <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>Inizia a costruire il tuo agente AI.</p>

          <form onSubmit={handleSignup} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium" style={{ color: "var(--muted)" }}>Nome</span>
              <div className="flex items-center gap-2 border rounded-xl px-3 py-2.5"
                style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
                <User size={15} style={{ color: "var(--muted)" }} />
                <input type="text" required value={name} onChange={e => setName(e.target.value)}
                  placeholder="Il tuo nome"
                  className="flex-1 bg-transparent text-sm outline-none" style={{ color: "var(--text)" }} />
              </div>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium" style={{ color: "var(--muted)" }}>Email</span>
              <div className="flex items-center gap-2 border rounded-xl px-3 py-2.5"
                style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
                <Mail size={15} style={{ color: "var(--muted)" }} />
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="tu@esempio.com"
                  className="flex-1 bg-transparent text-sm outline-none" style={{ color: "var(--text)" }} />
              </div>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium" style={{ color: "var(--muted)" }}>Password</span>
              <div className="flex items-center gap-2 border rounded-xl px-3 py-2.5"
                style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
                <Lock size={15} style={{ color: "var(--muted)" }} />
                <input type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Min. 8 caratteri"
                  className="flex-1 bg-transparent text-sm outline-none" style={{ color: "var(--text)" }} />
              </div>
            </label>

            {error && (
              <p className="text-xs px-3 py-2 rounded-xl"
                style={{ background: "rgba(239,68,68,.12)", color: "var(--danger)" }}>{error}</p>
            )}

            <button type="submit" disabled={loading}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-sm text-white mt-1 disabled:opacity-60"
              style={{ background: "linear-gradient(135deg,var(--primary),var(--accent))" }}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              {loading ? "Creazione account..." : "Registrati"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm mt-5" style={{ color: "var(--muted)" }}>
          Hai già un account?{" "}
          <Link href="/login" className="font-medium" style={{ color: "var(--primary)" }}>Accedi</Link>
        </p>
      </div>
    </div>
  );
}
