import { TelegramProvider } from "@/components/miniapp/TelegramProvider";
import { MiniAppLayout } from "@/components/miniapp/MiniAppLayout";

export const metadata = { title: "Sportly" };

export default function MiniAppRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <TelegramProvider>
      <MiniAppLayout>{children}</MiniAppLayout>
    </TelegramProvider>
  );
}
