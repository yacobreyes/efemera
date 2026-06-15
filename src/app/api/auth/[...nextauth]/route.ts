import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const ALLOWED_EMAIL = process.env.ADMIN_GOOGLE_EMAIL ?? "";

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ profile }) {
      return profile?.email === ALLOWED_EMAIL;
    },
    async session({ session }) {
      return session;
    },
  },
  pages: {
    signIn: "/admin/imago",
    error: "/admin/imago",
  },
});

export { handler as GET, handler as POST };
