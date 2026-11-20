import type { Metadata } from "next";
import { Barlow_Condensed, Barlow } from "next/font/google";
import "./globals.css";

const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  weight: ["800"],
  subsets: ["latin"],
  display: "swap",
});

const barlow = Barlow({
  variable: "--font-barlow",
  weight: ["400", "500"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "One Energy — Full Power",
  description: "One can. Full power. Built for high performance.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${barlowCondensed.variable} ${barlow.variable} h-full antialiased`}>
      <body className="min-h-full bg-[#0B1A2E] text-[#F5F7FA] font-sans overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
