import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";

import { TRPCReactProvider } from "~/trpc/react";
import { AuthProvider } from "@/contexts/AuthContext";

export const metadata: Metadata = {
  title: "Milestone AI - AI-Powered Goal Planning",
  description: "Transform your goals into actionable plans with AI assistance",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable}`}>
      <body>
        <TRPCReactProvider>
          <AuthProvider>{children}</AuthProvider>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
