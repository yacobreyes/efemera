import { getServerSession, type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { getUserByEmail, type FlatplanUser, type UserRole } from "./users";

// The bootstrap owner. This email is always allowed and always treated as an
// admin, even before any `user` records exist — so the first sign-in can create
// the rest of the team and nobody can lock themselves out.
const BOOTSTRAP_EMAIL = (process.env.ADMIN_GOOGLE_EMAIL ?? "").trim().toLowerCase();

function bootstrapUser(email: string, name?: string | null): FlatplanUser {
  const [firstName, ...rest] = (name ?? "").split(" ");
  return {
    _id: "bootstrap-owner",
    email,
    firstName: firstName || "Owner",
    lastName: rest.join(" ") || undefined,
    role: "admin",
    active: true,
  };
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    // Allow the bootstrap owner, or any active user in the Sanity user list.
    async signIn({ profile }) {
      const email = (profile as { email?: string } | undefined)?.email?.trim().toLowerCase();
      if (!email) return false;
      if (email === BOOTSTRAP_EMAIL) return true;
      return !!(await getUserByEmail(email));
    },
    async session({ session }) {
      return session;
    },
  },
  pages: {
    signIn: "/admin/flatplan",
    error: "/admin/flatplan",
  },
};

// Resolve the signed-in person to a Flatplan user record (with role), or null.
export async function getCurrentUser(): Promise<FlatplanUser | null> {
  try {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email?.trim().toLowerCase();
    if (!email) return null;
    if (email === BOOTSTRAP_EMAIL) return bootstrapUser(email, session?.user?.name);
    return await getUserByEmail(email);
  } catch {
    return null;
  }
}

export async function isAuthed(): Promise<boolean> {
  return !!(await getCurrentUser());
}

export async function currentRole(): Promise<UserRole | null> {
  return (await getCurrentUser())?.role ?? null;
}

export async function requireAuth(): Promise<FlatplanUser> {
  const u = await getCurrentUser();
  if (!u) throw new Error("Not authorized");
  return u;
}

// Gate admin-only actions (user management). Editors are rejected.
export async function requireAdmin(): Promise<FlatplanUser> {
  const u = await getCurrentUser();
  if (!u || u.role !== "admin") throw new Error("Admins only");
  return u;
}
