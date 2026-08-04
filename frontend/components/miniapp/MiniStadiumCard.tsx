import type { MouseEvent } from "react";
import { Heart, Share2, Star } from "lucide-react";
import { getImageUrl } from "@/lib/api";
import { Stadium } from "@/lib/types";
import { formatPrice } from "@/lib/utils";

interface MiniStadiumCardProps {
  stadium: Stadium;
  onClick: () => void;
}

export function MiniStadiumCard({ stadium, onClick }: MiniStadiumCardProps) {
  const shareStadium = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ title: stadium.name, text: stadium.description || stadium.address }).catch(() => {});
    }
  };

  const initials = stadium.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <article onClick={onClick} className="mini-card-solid mini-stadium-card mini-pressable">
      <div className="mini-stadium-media">
        {stadium.cover_image ? (
          <img src={getImageUrl(stadium.cover_image)} alt={stadium.name} />
        ) : (
          <div className="mini-stadium-placeholder">
            <div className="mini-stadium-initials">{initials}</div>
          </div>
        )}
        <div className="mini-stadium-overlay" />
        <div className="mini-stadium-dots" aria-hidden="true">
          <span className="mini-stadium-dot" />
          <span className="mini-stadium-dot" />
        </div>
        <div className="mini-stadium-rating">
          <Star size={16} fill="white" color="white" />
          {stadium.rating.toFixed(1)}
        </div>
      </div>

      <div className="mini-stadium-body">
        <h3 style={{ fontSize: 23, fontWeight: 900, letterSpacing: "-0.045em", lineHeight: 1.05, margin: 0, color: "white" }}>{stadium.name}</h3>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 16, marginTop: 5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {stadium.distance_km != null ? `${stadium.distance_km} km · ` : ""}{stadium.address}
        </p>

        {stadium.description && <p className="mini-stadium-description">{stadium.description}</p>}

        <div className="mini-stadium-action-row">
          <div className="mini-stadium-price-pill">{formatPrice(stadium.price_per_hour)}</div>
          <button
            type="button"
            aria-label="Sevimlilarga qo'shish"
            className="mini-stadium-icon-button mini-pressable"
            onClick={(event) => event.stopPropagation()}
          >
            <Heart size={20} />
          </button>
          <button
            type="button"
            aria-label="Ulashish"
            className="mini-stadium-icon-button mini-pressable"
            onClick={shareStadium}
          >
            <Share2 size={19} />
          </button>
          <button type="button" className="mini-stadium-detail-button mini-pressable" onClick={onClick}>
            Batafsil
          </button>
        </div>
      </div>
    </article>
  );
}
