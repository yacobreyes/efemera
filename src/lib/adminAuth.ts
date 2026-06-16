import { getServerSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

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
  try {
    const session = await getServerSession(authOptions);
    return session?.user?.email === (process.env.ADMIN_GOOGLE_EMAIL ?? "");
  } catch {
    return false;
  }
}

export async function requireAuth(): Promise<void> {
  if (!(await isAuthed())) throw new Error("Not authorized");
}
