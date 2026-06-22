import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { ThirdwebProvider } from "thirdweb/react";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Kuzana Mind — Know instantly.",
  description:
    "Ask anything about how we work. Get the right document or the right person — never a guess.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={manrope.variable}>
      <body>
        <ThirdwebProvider>{children}</ThirdwebProvider>
      </body>
    </html>
  );
}
