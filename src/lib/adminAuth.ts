import { cookies } from "next/headers";
import { createHash } from "crypto";

export const ADMIN_COOKIE = "efemera_admin";

export function adminPassword(): string {
  return process.env.ADMIN_PASSWORD ?? process.env.NEXT_PUBLIC_ADMIN_PASSWORD ?? "";
}

export function adminToken(): string {
  return createHash("sha256").update(`efemera-admin:${adminPassword()}`).digest("hex");
}

export async function isAuthed(): Promise<boolean> {
  if (!adminPassword()) return true; // no password configured — open admin (dev)
  const store = await cookies();
  return store.get(ADMIN_COOKIE)?.value === adminToken();
}

export async function requireAuth(): Promise<void> {
  if (!(await isAuthed())) throw new Error("Not authorized");
}
