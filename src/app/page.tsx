import { redirect } from "next/navigation";

// Supabase invia il codice auth alla root in alcuni scenari — lo passiamo al callback
export default async function RootPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; error?: string }>;
}) {
  const params = await searchParams;
  if (params.code) {
    redirect(`/auth/callback?code=${params.code}`);
  }
  redirect("/dashboard");
}
