import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { QueryProvider } from "@/components/providers/QueryProvider";

export const metadata: Metadata = {
  title: {
    default: "Andijan Futbol — Mini Stadionlar",
    template: "%s | Andijan Futbol",
  },
  description: "Andijondagi mini futbol stadionlarini toping va online bron qiling",
  keywords: ["andijan", "futbol", "mini stadion", "bron", "sport"],
  openGraph: {
    title: "Andijan Futbol",
    description: "Andijondagi mini futbol stadionlarini toping va online bron qiling",
    locale: "uz_UZ",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz">
      <body>
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
