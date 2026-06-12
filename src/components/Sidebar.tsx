"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Bot, Workflow, MessageSquare, BarChart3, Settings, Wand2, LogOut, KanbanSquare, Sparkles, Zap } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";

const nav = [
  { href: "/dashboard",  label: "Dashboard",     icon: LayoutDashboard },
  { href: "/wizard",     label: "Crea Sistema",  icon: Sparkles, highlight: true },
  { href: "/agents",     label: "Agent Builder", icon: Bot },
  { href: "/pipeline",   label: "Pipeline",      icon: KanbanSquare },
  { href: "/inbox",      label: "Inbox",         icon: MessageSquare },
  { href: "/sequences",  label: "Follow-up",     icon: Zap },
  { href: "/workflow",   label: "Workflow",       icon: Workflow },
  { href: "/analytics",  label: "Analytics",     icon: BarChart3 },
  { href: "/settings",   label: "Settings",      icon: Settings },
];

export default function Sidebar() {
  const path = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <aside className="w-64 shrink-0 h-screen sticky top-0 p-4 border-r flex flex-col"
      style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
      <div className="flex items-center gap-3 px-2 py-3 mb-4 font-bold text-lg">
        <div className="w-9 h-9 rounded-xl grid place-items-center text-white"
          style={{ background: "linear-gradient(135deg,var(--primary),var(--accent))" }}>
          <Wand2 size={18} />
        </div>
        Wafiq Agents
      </div>
      <nav className="flex flex-col gap-1 flex-1">
        {nav.map(({ href, label, icon: Icon, highlight }) => {
          const active = path === href;
          return (
            <Link key={href} href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition"
              style={{
                color: active ? "var(--text)" : highlight ? "var(--primary)" : "var(--muted)",
                background: active ? "rgba(124,58,237,.18)" : highlight ? "rgba(124,58,237,.08)" : "transparent",
                fontWeight: highlight ? 600 : undefined,
              }}>
              <Icon size={18} /> {label}
            </Link>
          );
        })}
      </nav>
      <button onClick={handleLogout}
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition w-full"
        style={{ color: "var(--muted)" }}>
        <LogOut size={18} /> Esci
      </button>
    </aside>
  );
}
