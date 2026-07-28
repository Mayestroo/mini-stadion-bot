"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { AdminButton, AdminCard, AdminEmptyState, AdminInput, AdminSelect, AdminShell } from "@/components/admin/AdminShell";
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

export default function AdminNotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await notificationApi.getAll({ q: query || undefined, type: type === "all" ? undefined : type, limit: 80 });
      setItems(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
    } catch {
      setError("Xatolik yuz berdi");
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
    <AdminShell title="Inbox" subtitle={`${unreadCount} ta o'qilmagan xabar`}>
      <AdminCard style={{ marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div>
          <strong>Barcha tizim xabarlari</strong>
          <p style={{ color: "var(--mini-muted)", fontSize: 13, marginTop: 4 }}>Bron, moderatsiya va broadcast xabarlari.</p>
        </div>
        <AdminButton onClick={markAllRead} disabled={unreadCount === 0}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><CheckCheck size={16} /> O'qildi</span>
        </AdminButton>
      </AdminCard>

      <AdminCard style={{ marginBottom: 12 }}>
        <div className="inbox-filter-panel" style={{ padding: 0, marginBottom: 0 }}>
          <AdminInput className="inbox-control" placeholder="Xabarlarni qidirish" value={query} onChange={(e) => setQuery(e.target.value)} />
          <AdminSelect className="inbox-control" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="all">Hammasi</option>
            <option value="booking">Booking</option>
            <option value="moderation">Moderation</option>
            <option value="broadcast">Broadcast</option>
            <option value="system">System</option>
          </AdminSelect>
        </div>
      </AdminCard>

      {loading ? (
        <div className="mini-loader mini-loader-sm"><div className="mini-loader-spinner" /><div>Yuklanmoqda...</div></div>
      ) : error ? (
        <AdminCard><p style={{ color: "var(--mini-red)", fontWeight: 700 }}>{error}</p></AdminCard>
      ) : items.length === 0 ? (
        <AdminEmptyState icon={<Bell size={26} />} title="Hali xabar yo'q" text="Admin xabarlari shu yerda ko'rinadi." />
      ) : (
        <div className="inbox-list">
          {items.map((item) => (
            <AdminCard key={item.id} className={`inbox-card${item.is_read ? "" : " inbox-card-unread"}`}>
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
            </AdminCard>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
