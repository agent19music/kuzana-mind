import type { Metadata } from "next";
import { Manrope, Geist } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Athena — Know instantly.",
  description:
    "Ask anything about how we work. Get the right document or the right person — never a guess.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider>
      <html lang="en" className={cn("font-sans", geist.variable)} data-theme="light" style={{ colorScheme: "light" }}>
        <body>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
