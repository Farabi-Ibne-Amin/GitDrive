import { type NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import { env } from "./env";

export const authOptions: NextAuthOptions = {
  providers: [
    GitHubProvider({
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
      // 'repo' scope is required to create repositories and read/write file
      // contents, including in private repos. 'read:user' lets us show
      // profile info (avatar, username) in the UI.
      authorization: {
        params: { scope: "repo read:user" },
      },
    }),
  ],
  session: {
    // JWT sessions avoid needing a database — the GitHub access token
    // itself is the source of truth for what the user can do.
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    // Persist the GitHub access token into the JWT right after sign-in.
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.accessToken = account.access_token;
        token.githubLogin = (profile as { login?: string }).login;
        token.githubId = (profile as { id?: number }).id;
        token.avatarUrl = (profile as { avatar_url?: string }).avatar_url;
      }
      return token;
    },
    // Expose only what the client needs. The raw access token IS included
    // here because our client components need it to know auth succeeded
    // and to pass along to our own API routes — but note NextAuth encrypts
    // the JWT cookie, and all actual GitHub API calls happen server-side
    // (see src/lib/github.ts), never directly from the browser.
    async session({ session, token }) {
      session.accessToken = token.accessToken as string;
      session.githubLogin = token.githubLogin as string;
      session.githubId = token.githubId as number;
      session.avatarUrl = token.avatarUrl as string | undefined;
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
  secret: env.NEXTAUTH_SECRET,
};
