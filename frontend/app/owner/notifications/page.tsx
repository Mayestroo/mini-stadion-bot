"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { ownerApi } from "@/lib/api";
import { OwnerButton, OwnerCard, OwnerShell } from "@/components/owner/OwnerShell";

type NotificationItem = {
  id: number;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
};

const notificationTypeLabels: Record<string, string> = {
  booking: "Bron",
  moderation: "Moderatsiya",
  broadcast: "Yangilik",
  system: "Tizim",
};

export default function OwnerNotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const data = await ownerApi.getNotifications({ q: query || undefined, type: type === "all" ? undefined : type, limit: 50 });
      setItems(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
    } finally {
      setLoading(false);
    }
  }, [query, type]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const markAllRead = async () => {
    await ownerApi.markAllNotificationsRead();
    await loadNotifications();
  };

  return (
    <OwnerShell>
      <OwnerCard style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h2 style={{ fontSize: 25, fontWeight: 950, letterSpacing: "-0.04em" }}>Xabarlar</h2>
            <p style={{ color: "#627064", marginTop: 6 }}>{unreadCount} ta o'qilmagan xabar</p>
          </div>
          <OwnerButton onClick={markAllRead} disabled={unreadCount === 0}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><CheckCheck size={16} /> O'qildi</span>
          </OwnerButton>
        </div>
      </OwnerCard>

      <OwnerCard style={{ marginBottom: 12 }}>
        <div className="inbox-filter-panel" style={{ padding: 0, marginBottom: 0 }}>
          <input className="inbox-control" placeholder="Xabarlarni qidirish" value={query} onChange={(e) => setQuery(e.target.value)} />
          <select className="inbox-control" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="all">Hammasi</option>
            <option value="booking">Booking</option>
            <option value="moderation">Moderation</option>
            <option value="broadcast">Broadcast</option>
            <option value="system">System</option>
          </select>
        </div>
      </OwnerCard>

      {loading ? (
        <OwnerCard>Yuklanmoqda...</OwnerCard>
      ) : items.length === 0 ? (
        <OwnerCard style={{ textAlign: "center", color: "#627064", padding: 34 }}>
          <Bell size={34} style={{ marginBottom: 10 }} />
          <div>Hozircha xabarlar yo'q</div>
        </OwnerCard>
      ) : (
        <div className="inbox-list">
          {items.map((item) => (
            <OwnerCard key={item.id} className={`inbox-card${item.is_read ? "" : " inbox-card-unread"}`}>
              <span className="inbox-type-chip">{notificationTypeLabels[item.type] || item.type}</span>
              <div className="inbox-card-head">
                <strong className="inbox-title">{item.title}</strong>
                {!item.is_read ? <span className="mini-chip inbox-unread-badge">Yangi</span> : null}
              </div>
              <p className="inbox-message">{item.message}</p>
              <div className="inbox-meta-row">
                <div className="inbox-date">{new Date(item.created_at).toLocaleString("uz-UZ")}</div>
                {!item.is_read ? <button className="inbox-read-action" onClick={async () => { await ownerApi.markNotificationRead(item.id); await loadNotifications(); }}>O'qildi</button> : null}
              </div>
            </OwnerCard>
          ))}
        </div>
      )}
    </OwnerShell>
  );
}
