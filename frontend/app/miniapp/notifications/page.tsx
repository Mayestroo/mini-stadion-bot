"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { notificationApi } from "@/lib/api";

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

export default function MiniAppNotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const data = await notificationApi.getAll({ q: query || undefined, type: type === "all" ? undefined : type, limit: 50 });
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
    await notificationApi.markAllRead();
    await loadNotifications();
  };

  return (
    <div>
      <div className="mini-title-row">
        <div>
          <div className="mini-eyebrow">Inbox</div>
          <h1 className="mini-large-title">Xabarlar</h1>
          <p className="mini-subtitle">{unreadCount} ta o'qilmagan xabar</p>
        </div>
        <button onClick={markAllRead} disabled={unreadCount === 0} className="mini-card-solid mini-pressable" style={{ border: 0, borderRadius: 16, padding: 12, color: "var(--mini-green)", opacity: unreadCount === 0 ? 0.5 : 1 }}>
          <CheckCheck size={20} />
        </button>
      </div>

      <div className="mini-card-solid inbox-filter-panel">
        <input className="inbox-control" placeholder="Xabarlarni qidirish" value={query} onChange={(e) => setQuery(e.target.value)} />
        <select className="inbox-control" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="all">Hammasi</option>
          <option value="booking">Booking</option>
          <option value="moderation">Moderation</option>
          <option value="broadcast">Broadcast</option>
          <option value="system">System</option>
        </select>
      </div>

      {loading ? (
        <div className="mini-card">Yuklanmoqda...</div>
      ) : items.length === 0 ? (
        <div className="mini-card" style={{ textAlign: "center", color: "var(--mini-muted)", padding: 34 }}>
          <Bell size={34} style={{ marginBottom: 10 }} />
          <div>Hozircha xabarlar yo'q</div>
        </div>
      ) : (
        <div className="inbox-list">
          {items.map((item) => (
            <div key={item.id} className={`mini-card inbox-card${item.is_read ? "" : " inbox-card-unread"}`}>
              <span className="inbox-type-chip">{notificationTypeLabels[item.type] || item.type}</span>
              <div className="inbox-card-head">
                <strong className="inbox-title">{item.title}</strong>
                {!item.is_read ? <span className="mini-chip inbox-unread-badge">Yangi</span> : null}
              </div>
              <p className="inbox-message">{item.message}</p>
              <div className="inbox-meta-row">
                <div className="inbox-date">{new Date(item.created_at).toLocaleString("uz-UZ")}</div>
                {!item.is_read ? <button className="inbox-read-action mini-pressable" onClick={async () => { await notificationApi.markRead(item.id); await loadNotifications(); }}>O'qildi</button> : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
