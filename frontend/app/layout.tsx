import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/components/providers/QueryProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Sportly — Mini Stadionlar",
    template: "%s | Sportly",
  },
  description: "Mini futbol stadionlarini toping va online bron qiling",
  keywords: ["sportly", "futbol", "mini stadion", "bron", "sport"],
  openGraph: {
    title: "Sportly",
    description: "Mini futbol stadionlarini toping va online bron qiling",
    locale: "uz_UZ",
    type: "website",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz" className={inter.className}>
      <body>
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
