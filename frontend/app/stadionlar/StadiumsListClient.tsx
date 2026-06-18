"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { stadiumApi } from "@/lib/api";
import { StadiumCard } from "@/components/stadium/StadiumCard";
import { Search } from "lucide-react";

export function StadiumsListClient() {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({
    has_lighting: undefined as boolean | undefined,
    has_parking: undefined as boolean | undefined,
    min_price: undefined as number | undefined,
    max_price: undefined as number | undefined,
  });

  const { data: stadiums = [], isLoading } = useQuery({
    queryKey: ["stadiums", search, filters],
    queryFn: () => stadiumApi.getAll({ search: search || undefined, ...filters }),
  });

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          backgroundColor: "var(--color-surface)",
          border: "1.5px solid var(--color-border)",
          borderRadius: "var(--radius-xl)",
          padding: "12px 16px",
          marginBottom: 20,
        }}
      >
        <Search size={18} color="var(--color-text-tertiary)" />
        <input
          type="text"
          placeholder="Stadion nomi yoki manzil..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            fontSize: 15,
            color: "var(--color-text-primary)",
            backgroundColor: "transparent",
          }}
        />
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        <FilterChip
          label="Chiroq"
          active={filters.has_lighting === true}
          onClick={() => setFilters((f) => ({ ...f, has_lighting: f.has_lighting ? undefined : true }))}
        />
        <FilterChip
          label="Parking"
          active={filters.has_parking === true}
          onClick={() => setFilters((f) => ({ ...f, has_parking: f.has_parking ? undefined : true }))}
        />
        <FilterChip
          label="100K gacha"
          active={filters.max_price === 100000}
          onClick={() => setFilters((f) => ({ ...f, max_price: f.max_price ? undefined : 100000 }))}
        />
        <FilterChip
          label="200K gacha"
          active={filters.max_price === 200000}
          onClick={() => setFilters((f) => ({ ...f, max_price: f.max_price === 200000 ? undefined : 200000 }))}
        />
      </div>

      {isLoading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} style={{ height: 340, borderRadius: "var(--radius-xl)", backgroundColor: "var(--color-bg-tertiary)" }} />
          ))}
        </div>
      ) : stadiums.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--color-text-secondary)" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚽</div>
          <p style={{ fontSize: 18, fontWeight: 600, color: "var(--color-text-primary)" }}>Stadion topilmadi</p>
          <p style={{ fontSize: 14, marginTop: 8 }}>Filtrlarni o'zgartiring</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
          {stadiums.map((stadium: any) => (
            <StadiumCard key={stadium.id} stadium={stadium} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 16px",
        borderRadius: "var(--radius-full)",
        fontSize: 13,
        fontWeight: 500,
        border: "1.5px solid",
        cursor: "pointer",
        transition: "all 0.15s ease",
        borderColor: active ? "var(--color-accent)" : "var(--color-border)",
        backgroundColor: active ? "var(--color-accent-light)" : "var(--color-surface)",
        color: active ? "var(--color-accent)" : "var(--color-text-secondary)",
      }}
    >
      {label}
    </button>
  );
}
