import type React from "react";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { SessionProvider } from "@/providers/session-provider";
import MiniKitProvider from "@/providers/minikit-provider";
import { ErudaProvider } from "@/providers/eruda-provider";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Election Voting",
  description: "Participate in ranked-choice elections with World ID verification",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ErrorBoundary>
          <ErudaProvider>
            <SessionProvider>
              <MiniKitProvider>{children}</MiniKitProvider>
            </SessionProvider>
          </ErudaProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
