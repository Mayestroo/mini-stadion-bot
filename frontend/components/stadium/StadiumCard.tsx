import Link from "next/link";
import { getImageUrl } from "@/lib/api";
import { Stadium } from "@/lib/types";
import { formatPrice, getSurfaceLabel } from "@/lib/utils";
import { Phone, MapPin, Star, Zap, Car, Droplets, Footprints } from "lucide-react";

const gradients = [
  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
  "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
  "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
  "linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)",
  "linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)",
];

interface StadiumCardProps {
  stadium: Stadium;
}

export function StadiumCard({ stadium }: StadiumCardProps) {
  return (
    <Link
      href={`/stadionlar/${stadium.slug}`}
      style={{ textDecoration: "none", display: "block" }}
    >
      <div
        style={{
          backgroundColor: "var(--color-surface)",
          borderRadius: "var(--radius-xl)",
          overflow: "hidden",
          boxShadow: "var(--shadow-sm)",
          border: "1px solid var(--color-border)",
          transition: "transform 0.2s ease, box-shadow 0.2s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.boxShadow = "var(--shadow-md)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "var(--shadow-sm)";
        }}
      >
        <div style={{ position: "relative", height: 200, overflow: "hidden", background: gradients[stadium.id % gradients.length] }}>
          {stadium.cover_image ? (
            <img
              src={getImageUrl(stadium.cover_image)}
              alt={stadium.name}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
              <Footprints size={56} color="rgba(255,255,255,0.35)" />
            </div>
          )}
          {stadium.is_featured && (
            <span
              style={{
                position: "absolute",
                top: 12,
                left: 12,
                backgroundColor: "var(--color-accent)",
                color: "white",
                fontSize: 11,
                fontWeight: 700,
                padding: "4px 10px",
                borderRadius: "var(--radius-full)",
                letterSpacing: "0.05em",
              }}
            >
              TOP
            </span>
          )}
          <div
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              display: "flex",
              alignItems: "center",
              gap: 4,
              backgroundColor: "rgba(0,0,0,0.6)",
              color: "white",
              padding: "4px 10px",
              borderRadius: "var(--radius-full)",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <Star size={12} fill="white" />
            {stadium.rating.toFixed(1)}
          </div>
        </div>

        <div style={{ padding: "16px" }}>
          <h3
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: "var(--color-text-primary)",
              marginBottom: 4,
              letterSpacing: "-0.01em",
            }}
          >
            {stadium.name}
          </h3>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              color: "var(--color-text-secondary)",
              fontSize: 13,
              marginBottom: 12,
            }}
          >
            <MapPin size={13} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {stadium.address}
            </span>
          </div>

          <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
            {stadium.has_lighting && (
              <AmenityBadge icon={<Zap size={11} />} label="Chiroq" />
            )}
            {stadium.has_parking && (
              <AmenityBadge icon={<Car size={11} />} label="Parking" />
            )}
            {stadium.has_shower && (
              <AmenityBadge icon={<Droplets size={11} />} label="Dush" />
            )}
            <AmenityBadge label={getSurfaceLabel(stadium.surface)} />
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <span style={{ fontSize: 18, fontWeight: 700, color: "var(--color-accent)" }}>
                {formatPrice(stadium.price_per_hour)}
              </span>
              <span style={{ fontSize: 12, color: "var(--color-text-secondary)", marginLeft: 4 }}>/ soat</span>
            </div>
            <a
              href={`tel:${stadium.phone}`}
              onClick={(e) => e.stopPropagation()}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                color: "var(--color-info)",
                fontSize: 13,
                fontWeight: 500,
                textDecoration: "none",
              }}
            >
              <Phone size={13} />
              {stadium.phone}
            </a>
          </div>
        </div>
      </div>
    </Link>
  );
}

function AmenityBadge({ icon, label }: { icon?: React.ReactNode; label: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: 11,
        fontWeight: 500,
        color: "var(--color-text-secondary)",
        backgroundColor: "var(--color-bg-secondary)",
        padding: "3px 8px",
        borderRadius: "var(--radius-full)",
      }}
    >
      {icon}
      {label}
    </span>
  );
}
