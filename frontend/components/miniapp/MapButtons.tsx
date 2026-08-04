function GoogleMapsPin() {
  return (
    <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true">
      <path d="M8 0a6 6 0 0 0-6 6c0 4.4 6 10 6 10s6-5.6 6-10a6 6 0 0 0-6-6z" fill="#EA4335" />
      <circle cx="8" cy="6" r="2.3" fill="#fff" />
    </svg>
  );
}

function YandexMapsPin() {
  return (
    <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true">
      <path d="M8 0a6 6 0 0 0-6 6c0 4.4 6 10 6 10s6-5.6 6-10a6 6 0 0 0-6-6z" fill="#FC3F1D" />
      <circle cx="8" cy="6" r="2.3" fill="#fff" />
      <circle cx="8" cy="6" r="1.1" fill="#FC3F1D" />
    </svg>
  );
}

/**
 * Row of map-provider buttons with brand pins. Renders only the providers
 * that have a URL; wrapper decides which links exist (explicit links win over
 * generated ones on the backend).
 */
export function MapButtons({ googleUrl, yandexUrl }: { googleUrl?: string | null; yandexUrl?: string | null }) {
  const links = [
    { key: "google", label: "Google Maps", color: "#1A73E8", bg: "rgba(26,115,232,0.10)", Icon: GoogleMapsPin, url: googleUrl },
    { key: "yandex", label: "Yandex Maps", color: "#FC3F1D", bg: "rgba(252,63,29,0.10)", Icon: YandexMapsPin, url: yandexUrl },
  ].filter((item) => item.url);
  if (links.length === 0) return null;

  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${links.length}, 1fr)`, gap: 8, marginTop: 8 }}>
      {links.map(({ key, label, color, bg, Icon, url }) => (
        <a
          key={key}
          href={url as string}
          target="_blank"
          rel="noopener noreferrer"
          className="mini-pressable"
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "11px 0", borderRadius: 14, background: bg, color, fontSize: 14, fontWeight: 700, textDecoration: "none" }}
        >
          <Icon />
          {label}
        </a>
      ))}
    </div>
  );
}
