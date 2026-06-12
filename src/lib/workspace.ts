export async function getOrCreateWorkspace(): Promise<string | null> {
  const res = await fetch("/api/workspace");
  if (!res.ok) {
    console.error("[workspace] API error:", res.status, await res.text());
    return null;
  }
  const { workspace_id } = await res.json();
  return workspace_id ?? null;
}
