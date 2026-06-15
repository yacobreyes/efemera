import { cookies, headers } from "next/headers";
import { createHash } from "crypto";
import { getServerSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const ADMIN_COOKIE = "efemera_admin";

export function adminPassword(): string {
  return process.env.ADMIN_PASSWORD ?? process.env.NEXT_PUBLIC_ADMIN_PASSWORD ?? "";
}

export function adminToken(): string {
  return createHash("sha256").update(`efemera-admin:${adminPassword()}`).digest("hex");
}

const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ profile }: { profile?: { email?: string } }) {
      return profile?.email === (process.env.ADMIN_GOOGLE_EMAIL ?? "");
    },
  },
};

export async function isAuthed(): Promise<boolean> {
  // Check Google OAuth session
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.email === (process.env.ADMIN_GOOGLE_EMAIL ?? "")) return true;
  } catch {}

  // Fall back to legacy cookie auth
  if (!adminPassword()) return true;
  const store = await cookies();
  return store.get(ADMIN_COOKIE)?.value === adminToken();
}

export async function requireAuth(): Promise<void> {
  if (!(await isAuthed())) throw new Error("Not authorized");
}
