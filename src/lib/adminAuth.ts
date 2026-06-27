import { getServerSession, type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const ALLOWED_EMAIL = process.env.ADMIN_GOOGLE_EMAIL ?? "";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ profile }) {
      return (profile as { email?: string } | undefined)?.email === ALLOWED_EMAIL;
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

export async function isAuthed(): Promise<boolean> {
  try {
    const session = await getServerSession(authOptions);
    return session?.user?.email === ALLOWED_EMAIL;
  } catch {
    return false;
  }
}

export async function requireAuth(): Promise<void> {
  if (!(await isAuthed())) throw new Error("Not authorized");
}
