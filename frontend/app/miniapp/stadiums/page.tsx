"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTelegram } from "@/components/miniapp/TelegramProvider";
import { stadiumApi } from "@/lib/api";
import { MiniStadiumCard } from "@/components/miniapp/MiniStadiumCard";
import { Search } from "lucide-react";

export default function MiniStadiumsPage() {
  const router = useRouter();
  const { theme } = useTelegram();
  const [search, setSearch] = useState("");

  const { data: stadiums = [] } = useQuery({
    queryKey: ["miniapp-stadiums-list", search],
    queryFn: () => stadiumApi.getAll({ search: search || undefined, limit: 50 }),
  });

  const textSec = theme === "dark" ? "#8e8e93" : "#6e6e73";

  return (
    <div>
      <div className="mini-title-row">
        <div>
          <div className="mini-eyebrow">Qidiruv</div>
          <h1 className="mini-large-title">Stadionlar</h1>
        </div>
        <span className="mini-chip">{stadiums.length} ta</span>
      </div>

      <div className="mini-search">
        <Search size={16} color={textSec} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Qidirish..."
        />
      </div>

      <div className="mini-list">
        {stadiums.map((s: any) => (
          <MiniStadiumCard key={s.id} stadium={s} onClick={() => router.push(`/miniapp/stadiums/${s.slug}`)} />
        ))}
      </div>
    </div>
  );
}
