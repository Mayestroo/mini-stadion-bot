"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Megaphone, RefreshCw, RotateCcw, Send } from "lucide-react";
import { AdminButton, AdminCard, AdminEmptyState, AdminErrorState, AdminInput, AdminSelect, AdminShell, AdminTextArea } from "@/components/admin/AdminShell";
import { useAdminToast } from "@/components/admin/AdminToast";
import { useRequireSuperadmin } from "@/lib/hooks/useRequireSuperadmin";
import { stadiumApi, superadminApi, uploadApi } from "@/lib/api";
import { Stadium } from "@/lib/types";

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
  status: string;
  error?: string | null;
  attempt_count: number;
};

const audienceLabels = { users: "Userlar", owners: "Ownerlar", all: "Hamma", booked_users: "Bron qilganlar", stadium_customers: "Stadion mijozlari" };

export default function AdminBroadcastPage() {
  const isSuperadmin = useRequireSuperadmin();
  const toast = useAdminToast();
  const queryClient = useQueryClient();
  const [audience, setAudience] = useState<"users" | "owners" | "all" | "booked_users" | "stadium_customers">("users");
  const [stadiumId, setStadiumId] = useState("");
  const [stadiumSearch, setStadiumSearch] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [ctaText, setCtaText] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [parseMode, setParseMode] = useState<"" | "HTML" | "Markdown">("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [targetCount, setTargetCount] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);

  const broadcastsQuery = useQuery<Broadcast[]>({
    queryKey: ["admin-broadcasts"],
    queryFn: superadminApi.getBroadcasts,
    // Poll while any broadcast is in flight; paused automatically in background tabs.
    refetchInterval: (query) =>
      (query.state.data ?? []).some((b) => b.status === "queued" || b.status === "sending") ? 4000 : false,
  });
  const broadcasts = useMemo(() => broadcastsQuery.data ?? [], [broadcastsQuery.data]);

  const expandedBroadcastActive = () => {
    const expanded = broadcasts.find((b) => b.id === expandedId);
    return expanded ? expanded.status === "queued" || expanded.status === "sending" : false;
  };

  const recipientsQuery = useQuery<Recipient[]>({
    queryKey: ["admin-broadcast-recipients", expandedId],
    queryFn: () => superadminApi.getBroadcastRecipients(expandedId!),
    enabled: expandedId !== null,
    refetchInterval: () => (expandedBroadcastActive() ? 4000 : false),
  });

  const stadiumsQuery = useQuery<Stadium[]>({
    queryKey: ["admin-broadcast-stadiums"],
    queryFn: () => stadiumApi.getAll({ limit: 100 }),
    enabled: isSuperadmin && audience === "stadium_customers",
    staleTime: 60_000,
  });
  const stadiumOptions = (stadiumsQuery.data ?? []).filter((s) =>
    s.name.toLowerCase().includes(stadiumSearch.trim().toLowerCase())
  );

  // Debounced target-count preview (mirrors the actual backend filter).
  useEffect(() => {
    if (!title.trim() || !message.trim()) {
      setTargetCount(null);
      return;
    }
    const timer = setTimeout(() => {
      superadminApi.previewBroadcast({
        audience,
        stadium_id: stadiumId ? Number(stadiumId) : undefined,
        title,
        message,
      }).then((data) => setTargetCount(data.target_count)).catch(() => setTargetCount(null));
    }, 300);
    return () => clearTimeout(timer);
  }, [audience, stadiumId, title, message]);

  const createMutation = useMutation({
    mutationFn: () => superadminApi.createBroadcast({
      audience,
      title,
      message,
      stadium_id: stadiumId ? Number(stadiumId) : undefined,
      image_url: imageUrl || undefined,
      cta_text: ctaText || undefined,
      cta_url: ctaUrl || undefined,
      parse_mode: parseMode || undefined,
    }),
    onSuccess: async (broadcast) => {
      toast.push("green", `${broadcast.total_count} ta qabul qiluvchi uchun navbatga qo'shildi`);
      setTitle(""); setMessage(""); setImageUrl(""); setCtaText(""); setCtaUrl(""); setParseMode(""); setStadiumId(""); setStadiumSearch("");
      await queryClient.invalidateQueries({ queryKey: ["admin-broadcasts"] });
    },
    onError: (error: any) => {
      toast.push("red", error.response?.data?.detail || "Xabar yuborishda xatolik yuz berdi");
    },
  });

  const retryMutation = useMutation({
    mutationFn: (id: number) => superadminApi.retryBroadcastFailed(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-broadcasts"] }),
    onError: (error: any) => {
      toast.push("red", error.response?.data?.detail || "Qayta yuborishda xatolik yuz berdi");
    },
  });

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

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!window.confirm(`${audienceLabels[audience]} uchun xabar navbatga qo'shilsinmi?`)) return;
    createMutation.mutate();
  };

  if (!isSuperadmin) return null;

  return (
    <AdminShell title="Ommaviy xabar" subtitle="Reklama, yangilik yoki bot bo'yicha ogohlantirish yuboring">
      <AdminCard style={{ marginBottom: 12 }}>
        <form onSubmit={submit} style={{ display: "grid", gap: 10 }}>
          <AdminSelect value={audience} onChange={(e) => { setAudience(e.target.value as typeof audience); setStadiumId(""); setStadiumSearch(""); }}>
            <option value="users">Userlar</option>
            <option value="owners">Ownerlar</option>
            <option value="all">Hamma</option>
            <option value="booked_users">Bron qilgan userlar</option>
            <option value="stadium_customers">Ma'lum stadion mijozlari</option>
          </AdminSelect>
          {audience === "stadium_customers" ? (
            <>
              <AdminInput placeholder="Stadionni qidirish..." value={stadiumSearch} onChange={(e) => setStadiumSearch(e.target.value)} />
              <AdminSelect value={stadiumId} onChange={(e) => setStadiumId(e.target.value)} required>
                <option value="">{stadiumsQuery.isLoading ? "Yuklanmoqda..." : "Stadionni tanlang"}</option>
                {stadiumOptions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </AdminSelect>
            </>
          ) : null}
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

          <AdminButton type="submit" disabled={createMutation.isPending}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><Send size={16} /> {createMutation.isPending ? "Navbatga qo'shilmoqda..." : "Previewni tasdiqlab yuborish"}</span>
          </AdminButton>
        </form>
      </AdminCard>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <h2 style={{ fontSize: 20 }}>So'nggi yuborishlar</h2>
        <button onClick={() => broadcastsQuery.refetch()} className="mini-card-solid mini-pressable" style={{ border: 0, borderRadius: 14, padding: 10, color: "var(--mini-blue)" }}><RefreshCw size={16} /></button>
      </div>

      {broadcastsQuery.isLoading ? (
        <div className="mini-loader mini-loader-sm"><div className="mini-loader-spinner" /><div>Yuklanmoqda...</div></div>
      ) : broadcastsQuery.isError ? (
        <AdminErrorState onRetry={() => broadcastsQuery.refetch()} />
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
                <AdminButton onClick={() => setExpandedId(expandedId === item.id ? null : item.id)} tone="dark">Detallar</AdminButton>
                {item.failed_count > 0 ? <AdminButton onClick={() => retryMutation.mutate(item.id)} tone="blue" disabled={retryMutation.isPending}><span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><RotateCcw size={15} /> Qayta</span></AdminButton> : null}
              </div>
              {expandedId === item.id ? (
                <div style={{ display: "grid", gap: 6, marginTop: 12 }}>
                  {recipientsQuery.isLoading ? <div className="mini-loader mini-loader-sm"><div className="mini-loader-spinner" /><div>Yuklanmoqda...</div></div> : null}
                  {recipientsQuery.isError ? <p style={{ color: "var(--mini-red)", fontSize: 13 }}>Qabul qiluvchilarni yuklab bo'lmadi</p> : null}
                  {(recipientsQuery.data ?? []).map((recipient) => (
                    <div key={recipient.id} className="mini-card-solid" style={{ padding: 10, fontSize: 12 }}>
                      <strong>{recipient.user_name}</strong>
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
