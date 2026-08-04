import type { MouseEvent } from "react";
import { Share2 } from "lucide-react";
import { getImageUrl } from "@/lib/api";
import { Training } from "@/lib/types";
import { sportLabel } from "@/lib/sports";

interface MiniTrainingCardProps {
  training: Training;
  onClick: () => void;
}

export function MiniTrainingCard({ training, onClick }: MiniTrainingCardProps) {
  const shareTraining = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ title: training.title, text: training.description || training.address }).catch(() => {});
    }
  };

  const initials = training.title
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <article onClick={onClick} className="mini-card-solid mini-stadium-card mini-pressable">
      <div className="mini-stadium-media">
        {training.cover_image ? (
          <img src={getImageUrl(training.cover_image)} alt={training.title} />
        ) : (
          <div className="mini-stadium-placeholder">
            <div className="mini-stadium-initials">{initials}</div>
          </div>
        )}
        <div className="mini-stadium-overlay" />
        <div className="mini-stadium-rating">{sportLabel(training.sport)}</div>
      </div>

      <div className="mini-stadium-body">
        <h3 style={{ fontSize: 23, fontWeight: 900, letterSpacing: "-0.045em", lineHeight: 1.05, margin: 0, color: "white" }}>{training.title}</h3>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 16, marginTop: 5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {[training.district, training.schedule_text].filter(Boolean).join(" · ") || training.address}
        </p>

        {training.description && <p className="mini-stadium-description">{training.description}</p>}

        <div className="mini-stadium-action-row">
          <div className="mini-stadium-price-pill">{training.price_text || "Kelishiladi"}</div>
          <button
            type="button"
            aria-label="Ulashish"
            className="mini-stadium-icon-button mini-pressable"
            onClick={shareTraining}
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
