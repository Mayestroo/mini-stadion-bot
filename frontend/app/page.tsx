import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { FeaturedStadiums } from "@/components/stadium/FeaturedStadiums";

export default function HomePage() {
  return (
    <>
      <Header />

      <section
        style={{
          background: "linear-gradient(135deg, #0a1628 0%, #1a2f4e 100%)",
          padding: "80px 20px 100px",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", inset: 0, opacity: 0.04, backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

        <div style={{ position: "relative", maxWidth: 700, margin: "0 auto" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              backgroundColor: "rgba(52,199,89,0.15)",
              border: "1px solid rgba(52,199,89,0.3)",
              color: "#34C759",
              padding: "6px 16px",
              borderRadius: "var(--radius-full)",
              fontSize: 13,
              fontWeight: 600,
              marginBottom: 24,
              letterSpacing: "0.05em",
            }}
          >
            ⚡ MAYDONCHA · MINI FUTBOL
          </div>

          <h1
            style={{
              fontSize: "clamp(36px, 6vw, 64px)",
              fontWeight: 800,
              color: "white",
              lineHeight: 1.1,
              letterSpacing: "-0.03em",
              marginBottom: 20,
            }}
          >
            O'yin maydoni —
            <br />
            <span style={{ color: "#34C759" }}>bir zumda bron</span>
          </h1>

          <p
            style={{
              fontSize: 18,
              color: "rgba(255,255,255,0.65)",
              lineHeight: 1.6,
              marginBottom: 36,
              maxWidth: 500,
              margin: "0 auto 36px",
            }}
          >
            Andijondagi mini futbol stadionlarini toping, narxlarni solishtiring va online bron qiling
          </p>

          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link
              href="/stadionlar"
              style={{
                padding: "16px 32px",
                borderRadius: "var(--radius-full)",
                fontSize: 16,
                fontWeight: 700,
                textDecoration: "none",
                color: "white",
                backgroundColor: "var(--color-accent)",
                boxShadow: "0 4px 20px rgba(52,199,89,0.4)",
              }}
            >
              Stadionlarni ko'rish
            </Link>
            <a
              href="https://t.me/maydoncha_bot"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: "16px 32px",
                borderRadius: "var(--radius-full)",
                fontSize: 16,
                fontWeight: 600,
                textDecoration: "none",
                color: "white",
                backgroundColor: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.2)",
              }}
            >
              Telegram Bot
            </a>
          </div>
        </div>
      </section>

      <section style={{ backgroundColor: "var(--color-surface)", borderBottom: "1px solid var(--color-border)" }}>
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "32px 20px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: 24,
            textAlign: "center",
          }}
        >
          {[
            { value: "5+", label: "Stadion" },
            { value: "24/7", label: "Bron qilish" },
            { value: "100%", label: "Online" },
            { value: "0", label: "Komissiya" },
          ].map((stat) => (
            <div key={stat.label}>
              <div style={{ fontSize: 32, fontWeight: 800, color: "var(--color-accent)", letterSpacing: "-0.03em" }}>{stat.value}</div>
              <div style={{ fontSize: 14, color: "var(--color-text-secondary)", marginTop: 4 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 24 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em" }}>Top Stadionlar</h2>
          <Link href="/stadionlar" style={{ fontSize: 14, color: "var(--color-accent)", textDecoration: "none", fontWeight: 500 }}>
            Barchasi →
          </Link>
        </div>
        <FeaturedStadiums />
      </section>

      <footer style={{ backgroundColor: "var(--color-text-primary)", color: "white", padding: "40px 20px", marginTop: 40 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>⚽ Maydoncha</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>© 2025 Maydoncha. Barcha huquqlar himoyalangan.</div>
          </div>
          <div style={{ display: "flex", gap: 24 }}>
            <a href="https://t.me/maydoncha_bot" target="_blank" rel="noopener noreferrer" style={{ color: "rgba(255,255,255,0.7)", textDecoration: "none", fontSize: 14 }}>Telegram Bot</a>
            <Link href="/stadionlar" style={{ color: "rgba(255,255,255,0.7)", textDecoration: "none", fontSize: 14 }}>Stadionlar</Link>
            <Link href="/admin" style={{ color: "rgba(255,255,255,0.7)", textDecoration: "none", fontSize: 14 }}>Admin</Link>
          </div>
        </div>
      </footer>
    </>
  );
}


