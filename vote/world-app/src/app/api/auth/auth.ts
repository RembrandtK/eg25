import { MiniKit, verifySiweMessage } from "@worldcoin/minikit-js";
import type { NextAuthOptions } from "next-auth";
import { getVerifiedMessage } from "../complete-siwe/route";

export const authOptions: NextAuthOptions = {
  providers: [
    {
      id: "worldcoin-wallet",
      name: "Worldcoin Wallet",
      type: "credentials",
      credentials: {
        message: { type: "text" },
        signature: { type: "text" },
        address: { type: "text" },
        nonce: { type: "text" },
      },
      async authorize(credentials) {
        if (
          !credentials?.signature ||
          !credentials?.message ||
          !credentials?.address ||
          !credentials?.nonce
        ) {
          return null;
        }
        try {
          // First check if we already verified this message
          const cachedVerification = getVerifiedMessage(credentials.address, credentials.nonce);

          if (cachedVerification && cachedVerification.isValid) {
            console.log('✅ Using cached SIWE verification for:', credentials.address);

            const userProfile = await MiniKit.getUserByAddress(credentials.address);
            console.log('👤 User profile:', {
              id: credentials.address.toLowerCase(),
              address: credentials.address.toLowerCase(),
              name: userProfile.username,
              image: userProfile.profilePictureUrl,
            });

            return {
              id: credentials.address.toLowerCase(),
              address: credentials.address.toLowerCase(),
              name: userProfile.username,
              image: userProfile.profilePictureUrl,
            };
          }

          // Fallback to direct verification if no cached result
          console.log('🔄 No cached verification found, verifying directly...');
          const validMessage = await verifySiweMessage(
            {
              status: "success",
              message: credentials.message,
              signature: credentials.signature,
              address: credentials.address,
              version: 1,
            },
            credentials.nonce
          );

          if (!validMessage.isValid || !validMessage.siweMessageData.address) {
            console.error('❌ Direct SIWE verification failed');
            return null;
          }

          const userProfile = await MiniKit.getUserByAddress(
            validMessage.siweMessageData.address
          );
          console.log('✅ Direct SIWE verification successful:', {
            id: validMessage.siweMessageData.address.toLowerCase(),
            address: validMessage.siweMessageData.address.toLowerCase(),
            name: userProfile.username,
            image: userProfile.profilePictureUrl,
          });

          return {
            id: validMessage.siweMessageData.address.toLowerCase(),
            address: validMessage.siweMessageData.address.toLowerCase(),
            name: userProfile.username,
            image: userProfile.profilePictureUrl,
          };
        } catch (e) {
          console.error("❌ Error in NextAuth authorize:", e);
          return null;
        }
      },
    },
  ],
  callbacks: {
    redirect() {
      return process.env.NEXT_PUBLIC_APP_URL as string;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.address = token.sub;
      }
      return session;
    },
    async jwt({ token }) {
      return token;
    },
  },
  pages: {
    signIn: "/",
  },
};
