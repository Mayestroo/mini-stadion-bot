import { Header } from "@/components/layout/Header";
import { StadiumsListClient } from "./StadiumsListClient";

export const metadata = { title: "Stadionlar" };

export default function StadiumsPage() {
  return (
    <>
      <Header />
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 20px" }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "var(--color-text-primary)", letterSpacing: "-0.02em" }}>
            Mini Futbol Stadionlari
          </h1>
          <p style={{ fontSize: 15, color: "var(--color-text-secondary)", marginTop: 6 }}>
            Andijondagi barcha mini futbol maydonlari
          </p>
        </div>
        <StadiumsListClient />
      </main>
    </>
  );
}
