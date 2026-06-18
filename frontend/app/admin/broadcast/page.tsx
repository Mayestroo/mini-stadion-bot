"use client";

import { useEffect, useState } from "react";
import { Megaphone, RefreshCw, RotateCcw, Send } from "lucide-react";
import { AdminButton, AdminCard, AdminEmptyState, AdminInput, AdminSelect, AdminShell, AdminTextArea } from "@/components/admin/AdminShell";
import { superadminApi, uploadApi } from "@/lib/api";

type Broadcast = {
  id: number;
  title: string;
  message: string;
  image_url?: string | null;
  cta_text?: string | null;
  cta_url?: string | null;
  parse_mode?: string | null;
  audience: "users" | "owners" | "all" | "booked_users" | "stadium_customers";
  stadium_id?: number | null;
  status: string;
  total_count: number;
  sent_count: number;
  failed_count: number;
  created_at: string;
};

type Recipient = {
  id: number;
  user_name: string;
  telegram_id?: string | null;
  status: string;
  error?: string | null;
  attempt_count: number;
};

const audienceLabels = { users: "Userlar", owners: "Ownerlar", all: "Hamma", booked_users: "Bron qilganlar", stadium_customers: "Stadion mijozlari" };

export default function AdminBroadcastPage() {
  const [audience, setAudience] = useState<"users" | "owners" | "all" | "booked_users" | "stadium_customers">("users");
  const [stadiumId, setStadiumId] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [ctaText, setCtaText] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [parseMode, setParseMode] = useState<"" | "HTML" | "Markdown">("");
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [recipients, setRecipients] = useState<Record<number, Recipient[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [targetCount, setTargetCount] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);

  const loadBroadcasts = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      setBroadcasts(await superadminApi.getBroadcasts());
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    loadBroadcasts();
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => loadBroadcasts(false), 5000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!title.trim() || !message.trim()) {
      setTargetCount(null);
      return;
    }
    superadminApi.previewBroadcast({
      audience,
      stadium_id: stadiumId ? Number(stadiumId) : undefined,
      title,
      message,
    }).then((data) => setTargetCount(data.target_count)).catch(() => setTargetCount(null));
  }, [audience, stadiumId, title, message]);

  const uploadImage = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const data = await uploadApi.broadcastImage(file);
      setImageUrl(data.url);
    } finally {
      setUploading(false);
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!window.confirm(`${audienceLabels[audience]} uchun xabar navbatga qo'shilsinmi?`)) return;
    setSaving(true);
    setFeedback("");
    try {
      const broadcast = await superadminApi.createBroadcast({
        audience,
        title,
        message,
        stadium_id: stadiumId ? Number(stadiumId) : undefined,
        image_url: imageUrl || undefined,
        cta_text: ctaText || undefined,
        cta_url: ctaUrl || undefined,
        parse_mode: parseMode || undefined,
      });
      setFeedback(`${broadcast.total_count} ta qabul qiluvchi uchun navbatga qo'shildi`);
      setTitle("");
      setMessage("");
      setImageUrl("");
      setCtaText("");
      setCtaUrl("");
      setParseMode("");
      setStadiumId("");
      await loadBroadcasts();
    } catch (error: any) {
      setFeedback(error.response?.data?.detail || "Xabar yuborishda xatolik yuz berdi");
    } finally {
      setSaving(false);
    }
  };

  const retryFailed = async (id: number) => {
    await superadminApi.retryBroadcastFailed(id);
    await loadBroadcasts(false);
  };

  const toggleRecipients = async (id: number) => {
    if (recipients[id]) {
      setRecipients((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      return;
    }
    const data = await superadminApi.getBroadcastRecipients(id);
    setRecipients((current) => ({ ...current, [id]: data }));
  };

  return (
    <AdminShell title="Ommaviy xabar" subtitle="Reklama, yangilik yoki bot bo'yicha ogohlantirish yuboring">
      <AdminCard style={{ marginBottom: 12 }}>
        <form onSubmit={submit} style={{ display: "grid", gap: 10 }}>
          <AdminSelect value={audience} onChange={(e) => setAudience(e.target.value as "users" | "owners" | "all" | "booked_users" | "stadium_customers")}>
            <option value="users">Userlar</option>
            <option value="owners">Ownerlar</option>
            <option value="all">Hamma</option>
            <option value="booked_users">Bron qilgan userlar</option>
            <option value="stadium_customers">Ma'lum stadion mijozlari</option>
          </AdminSelect>
          {audience === "stadium_customers" ? <AdminInput placeholder="Stadion ID" value={stadiumId} onChange={(e) => setStadiumId(e.target.value)} required type="number" min={1} /> : null}
          <AdminInput placeholder="Sarlavha" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={160} />
          <AdminTextArea placeholder="Xabar matni" value={message} onChange={(e) => setMessage(e.target.value)} required rows={6} />
          <AdminInput placeholder="Rasm URL (ixtiyoriy)" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
          <input className="mini-file-control" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => uploadImage(e.target.files?.[0])} disabled={uploading} />
          {uploading ? <p style={{ color: "var(--mini-muted)", fontSize: 12 }}>Rasm yuklanmoqda...</p> : null}
          <div className="mini-responsive-grid-2">
            <AdminInput placeholder="Tugma matni" value={ctaText} onChange={(e) => setCtaText(e.target.value)} />
            <AdminInput placeholder="Tugma URL" value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} />
          </div>
          <AdminSelect value={parseMode} onChange={(e) => setParseMode(e.target.value as "" | "HTML" | "Markdown")}>
            <option value="">Oddiy matn</option>
            <option value="HTML">HTML</option>
            <option value="Markdown">Markdown</option>
          </AdminSelect>

          {(title || message || imageUrl || ctaText) ? (
            <div className="mini-card-solid" style={{ padding: 12 }}>
              <div className="mini-eyebrow">Preview</div>
              {targetCount !== null ? <div className="mini-chip" style={{ marginBottom: 8 }}>Target: {targetCount} ta</div> : null}
              {imageUrl ? <div style={{ height: 110, borderRadius: 16, background: `url(${imageUrl}) center/cover`, marginBottom: 10 }} /> : null}
              <strong>{title || "Sarlavha"}</strong>
              <p style={{ whiteSpace: "pre-line", color: "var(--mini-muted)", marginTop: 6 }}>{message || "Xabar matni"}</p>
              {ctaText ? <span className="mini-chip" style={{ marginTop: 8 }}>{ctaText}</span> : null}
            </div>
          ) : null}

          <AdminButton type="submit" disabled={saving}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><Send size={16} /> {saving ? "Navbatga qo'shilmoqda..." : "Previewni tasdiqlab yuborish"}</span>
          </AdminButton>
          {feedback ? <p style={{ color: feedback.includes("xatolik") || feedback.includes("mumkin") || feedback.includes("yuborilmoqda") ? "var(--mini-red)" : "var(--mini-green)", fontSize: 13 }}>{feedback}</p> : null}
        </form>
      </AdminCard>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <h2 style={{ fontSize: 20 }}>So'nggi yuborishlar</h2>
        <button onClick={() => loadBroadcasts(false)} className="mini-card-solid mini-pressable" style={{ border: 0, borderRadius: 14, padding: 10, color: "var(--mini-blue)" }}><RefreshCw size={16} /></button>
      </div>

      {loading ? (
        <AdminCard>Yuklanmoqda...</AdminCard>
      ) : broadcasts.length === 0 ? (
        <AdminEmptyState icon={<Megaphone size={26} />} title="Hali xabar yo'q" text="Yuborilgan ommaviy xabarlar shu yerda ko'rinadi." />
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {broadcasts.map((item) => (
            <AdminCard key={item.id}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
                <strong>{item.title}</strong>
                <span className="mini-chip">{audienceLabels[item.audience]}</span>
              </div>
              <p style={{ color: "var(--mini-muted)", whiteSpace: "pre-line", fontSize: 14 }}>{item.message}</p>
              <div style={{ height: 8, borderRadius: 8, background: "var(--mini-line)", overflow: "hidden", marginTop: 12 }}>
                <div style={{ height: "100%", width: `${item.total_count ? Math.round(((item.sent_count + item.failed_count) / item.total_count) * 100) : 0}%`, background: item.failed_count ? "var(--mini-orange)" : "var(--mini-green)" }} />
              </div>
              <div className="mini-responsive-grid-4" style={{ marginTop: 12, fontSize: 12 }}>
                <span>Status: {item.status}</span>
                <span>Jami: {item.total_count}</span>
                <span>Yuborildi: {item.sent_count}</span>
                <span>Xato: {item.failed_count}</span>
              </div>
              <div className="mini-action-row">
                <AdminButton onClick={() => toggleRecipients(item.id)} tone="dark">Detallar</AdminButton>
                {item.failed_count > 0 ? <AdminButton onClick={() => retryFailed(item.id)} tone="blue"><span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><RotateCcw size={15} /> Qayta</span></AdminButton> : null}
              </div>
              {recipients[item.id] ? (
                <div style={{ display: "grid", gap: 6, marginTop: 12 }}>
                  {recipients[item.id].map((recipient) => (
                    <div key={recipient.id} className="mini-card-solid" style={{ padding: 10, fontSize: 12 }}>
                      <strong>{recipient.user_name}</strong> <span style={{ color: "var(--mini-muted)" }}>({recipient.telegram_id || "telegram yo'q"})</span>
                      <div>Status: {recipient.status} | urinish: {recipient.attempt_count}</div>
                      {recipient.error ? <div style={{ color: "var(--mini-red)", overflowWrap: "anywhere" }}>{recipient.error}</div> : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </AdminCard>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
