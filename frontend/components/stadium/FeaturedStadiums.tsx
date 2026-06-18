"use client";
import { useQuery } from "@tanstack/react-query";
import { stadiumApi } from "@/lib/api";
import { StadiumCard } from "./StadiumCard";

export function FeaturedStadiums() {
  const { data: stadiums = [], isLoading } = useQuery({
    queryKey: ["featured-stadiums"],
    queryFn: () => stadiumApi.getAll({ featured: true, limit: 3 }),
  });

  if (isLoading) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
        {[...Array(3)].map((_, i) => (
          <div key={i} style={{ height: 300, borderRadius: "var(--radius-xl)", backgroundColor: "var(--color-bg-tertiary)" }} />
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
      {stadiums.map((s: any) => (
        <StadiumCard key={s.id} stadium={s} />
      ))}
    </div>
  );
}
