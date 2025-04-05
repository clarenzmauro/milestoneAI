import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { Session } from "next-auth";
import { JWT } from "next-auth/jwt";

// Extend the Session and User types
interface ExtendedUser {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

interface ExtendedSession extends Omit<Session, 'user'> {
  user?: ExtendedUser;
  accessToken?: string;
}

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.appdata",
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
  ],
  pages: {
    signIn: "/auth/signin",
  },
  callbacks: {
    async jwt({ token, account, user }: { token: JWT; account: any; user: any }) {
      // Initial sign in
      if (account && user) {
        console.log("Setting initial token with access token and refresh token");
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          accessTokenExpires: account.expires_at * 1000, // Convert to milliseconds
          user,
        };
      }

      // Return previous token if the access token has not expired yet
      if (Date.now() < (token.accessTokenExpires as number || 0)) {
        console.log("Existing token is still valid");
        return token;
      }

      // Access token has expired, try to refresh it
      console.log("Token expired, attempting to refresh");
      try {
        if (!token.refreshToken) {
          console.error("No refresh token available");
          return { ...token, error: "RefreshTokenNotAvailable" };
        }
        
        const response = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID as string,
            client_secret: process.env.GOOGLE_CLIENT_SECRET as string,
            grant_type: "refresh_token",
            refresh_token: token.refreshToken as string,
          }),
        });
        
        const refreshedTokens = await response.json();
        
        if (!response.ok) {
          console.error("Error refreshing token:", refreshedTokens);
          return { ...token, error: "RefreshAccessTokenError" };
        }
        
        console.log("Token refreshed successfully");
        return {
          ...token,
          accessToken: refreshedTokens.access_token,
          accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
          // Fall back to old refresh token, but use new one if available
          refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
        };
      } catch (error) {
        console.error("Error refreshing access token", error);
        return { ...token, error: "RefreshAccessTokenError" };
      }
    },
    async session({ session, token }: { session: ExtendedSession; token: JWT }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      // Include access token in session
      session.accessToken = token.accessToken as string;
      
      // Add error field to session if it exists in token
      if (token.error) {
        (session as any).error = token.error;
      }
      
      return session;
    },
  },
  debug: process.env.NODE_ENV === "development",
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST }; 