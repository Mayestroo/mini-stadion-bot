"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTelegram } from "@/components/miniapp/TelegramProvider";
import { stadiumApi } from "@/lib/api";
import { MiniStadiumCard } from "@/components/miniapp/MiniStadiumCard";
import { MapPin, Search } from "lucide-react";

type Coords = { lat: number; lng: number };

export default function MiniStadiumsPage() {
  const router = useRouter();
  const { theme, showAlert } = useTelegram();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [district, setDistrict] = useState("");
  const [coords, setCoords] = useState<Coords | null>(null);
  const [locating, setLocating] = useState(false);

  // Debounce: one request per pause in typing instead of one per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: districts = [] } = useQuery({
    queryKey: ["miniapp-districts"],
    queryFn: () => stadiumApi.getDistricts(),
    staleTime: 5 * 60_000,
  });

  const { data: stadiums = [] } = useQuery({
    queryKey: ["miniapp-stadiums-list", debouncedSearch, district, coords?.lat, coords?.lng],
    queryFn: () =>
      stadiumApi.getAll({
        search: debouncedSearch || undefined,
        district: district || undefined,
        sort: coords ? "nearest" : undefined,
        lat: coords?.lat,
        lng: coords?.lng,
        limit: 50,
      }),
    placeholderData: (previous) => previous,
  });

  const textSec = theme === "dark" ? "#8e8e93" : "#6e6e73";

  const requestLocation = () => {
    // Toggle off when already active.
    if (coords) {
      setCoords(null);
      return;
    }
    setLocating(true);
    const finish = (result: Coords | null) => {
      setLocating(false);
      if (result) setCoords(result);
      else showAlert?.("Joylashuvni aniqlab bo'lmadi. Ruxsat bering va qayta urinib ko'ring.");
    };

    // Prefer Telegram's native permission flow; fall back to the browser's.
    const locationManager = (window as any).Telegram?.WebApp?.LocationManager;
    if (locationManager) {
      try {
        locationManager.init((ok: boolean) => {
          if (!ok) return finish(null);
          locationManager.getLocation((data: any) => {
            finish(data && data.latitude != null ? { lat: data.latitude, lng: data.longitude } : null);
          });
        });
        return;
      } catch {
        // Older clients: fall through to navigator.geolocation.
      }
    }
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => finish({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => finish(null),
        { timeout: 10_000 }
      );
      return;
    }
    finish(null);
  };

  const chipStyle = (active: boolean): React.CSSProperties => ({
    border: 0,
    borderRadius: 999,
    padding: "8px 14px",
    fontSize: 13,
    fontWeight: 750,
    cursor: "pointer",
    whiteSpace: "nowrap",
    flexShrink: 0,
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    background: active ? "rgba(52,199,89,0.15)" : "var(--mini-surface-solid)",
    color: active ? "var(--mini-green)" : "var(--mini-muted)",
    boxShadow: active ? "none" : "0 1px 2px rgba(0,0,0,0.04)",
  });

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

      <div style={{ display: "flex", gap: 8, overflowX: "auto", margin: "2px -16px 14px", padding: "0 16px 6px", scrollbarWidth: "none" }}>
        <button type="button" className="mini-pressable" style={chipStyle(coords !== null)} onClick={requestLocation} disabled={locating} aria-label="Eng yaqin stadionlar">
          <MapPin size={13} />
          {coords ? "Eng yaqin ✓" : locating ? "Aniqlanmoqda..." : "Eng yaqin"}
        </button>
        <button type="button" className="mini-pressable" style={chipStyle(district === "")} onClick={() => setDistrict("")}>
          Hammasi
        </button>
        {districts.map((d) => (
          <button key={d} type="button" className="mini-pressable" style={chipStyle(district === d)} onClick={() => setDistrict(d)}>
            {d}
          </button>
        ))}
      </div>

      <div className="mini-list">
        {stadiums.map((s: any) => (
          <MiniStadiumCard key={s.id} stadium={s} onClick={() => router.push(`/miniapp/stadiums/${s.slug}`)} />
        ))}
      </div>
    </div>
  );
}
