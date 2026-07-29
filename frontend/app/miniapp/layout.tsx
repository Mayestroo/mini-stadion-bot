import Script from "next/script";
import { TelegramProvider } from "@/components/miniapp/TelegramProvider";
import { MiniAppLayout } from "@/components/miniapp/MiniAppLayout";

export const metadata = { title: "Sportly" };

export default function MiniAppRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
      <TelegramProvider>
        <MiniAppLayout>{children}</MiniAppLayout>
      </TelegramProvider>
    </>
  );
}
