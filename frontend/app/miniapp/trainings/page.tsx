"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTelegram } from "@/components/miniapp/TelegramProvider";
import { trainingApi } from "@/lib/api";
import { SPORTS } from "@/lib/sports";
import { Training } from "@/lib/types";
import { MiniTrainingCard } from "@/components/miniapp/MiniTrainingCard";
import { Search } from "lucide-react";

export default function MiniTrainingsPage() {
  const router = useRouter();
  const { theme } = useTelegram();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sport, setSport] = useState("");

  // Debounce: one request per pause in typing instead of one per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: trainings = [] } = useQuery<Training[]>({
    queryKey: ["miniapp-trainings-list", debouncedSearch, sport],
    queryFn: () => trainingApi.getAll({ search: debouncedSearch || undefined, sport: sport || undefined, limit: 50 }),
  });

  const textSec = theme === "dark" ? "#8e8e93" : "#6e6e73";

  return (
    <div>
      <div className="mini-title-row">
        <div>
          <div className="mini-eyebrow">Mashg'ulotlar</div>
          <h1 className="mini-large-title">Sport treninglari</h1>
        </div>
        <span className="mini-chip">{trainings.length} ta</span>
      </div>

      <div className="mini-search">
        <Search size={16} color={textSec} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Qidirish..."
        />
      </div>

      <div className="hide-scrollbar" style={{ display: "flex", gap: 8, overflowX: "auto", marginBottom: 16, paddingBottom: 2 }}>
        <SportChip label="Hammasi" active={sport === ""} onClick={() => setSport("")} />
        {SPORTS.map((s) => (
          <SportChip key={s.value} label={s.label} active={sport === s.value} onClick={() => setSport(s.value)} />
        ))}
      </div>

      <div className="mini-list">
        {trainings.length === 0 ? (
          <div className="mini-card" style={{ padding: 24, textAlign: "center", color: "var(--mini-muted)" }}>
            Mashg'ulotlar topilmadi
          </div>
        ) : (
          trainings.map((t) => (
            <MiniTrainingCard key={t.id} training={t} onClick={() => router.push(`/miniapp/trainings/${t.slug}`)} />
          ))
        )}
      </div>

      <style>{`.hide-scrollbar::-webkit-scrollbar { display:none; } .hide-scrollbar { -ms-overflow-style:none; scrollbar-width:none; }`}</style>
    </div>
  );
}

function SportChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mini-pressable"
      style={{
        flex: "0 0 auto",
        border: active ? "none" : "1px solid var(--mini-line)",
        borderRadius: 999,
        padding: "8px 14px",
        fontSize: 13,
        fontWeight: 750,
        cursor: "pointer",
        background: active ? "linear-gradient(180deg, #38d46a 0%, #30b95b 100%)" : "var(--mini-surface-solid)",
        color: active ? "white" : "var(--mini-muted)",
      }}
    >
      {label}
    </button>
  );
}
