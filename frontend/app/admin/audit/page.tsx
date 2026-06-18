"use client";

import { useEffect, useState } from "react";
import { ScrollText } from "lucide-react";
import { AdminCard, AdminEmptyState, AdminInput, AdminShell } from "@/components/admin/AdminShell";
import { superadminApi } from "@/lib/api";

type AuditLog = {
  id: number;
  actor_name?: string | null;
  action: string;
  entity_type?: string | null;
  entity_id?: number | null;
  metadata_json?: Record<string, unknown> | null;
  created_at: string;
};

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [action, setAction] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    setLoading(true);
    superadminApi.getAuditLogs({
      q: q || undefined,
      action: action || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      limit: 100,
    }).then(setLogs).finally(() => setLoading(false));
  }, [q, action, dateFrom, dateTo]);

  return (
    <AdminShell title="Audit log" subtitle="Muhim admin actionlar tarixi">
      <AdminCard style={{ display: "grid", gap: 8, marginBottom: 12 }}>
        <AdminInput placeholder="Qidirish" value={q} onChange={(e) => setQ(e.target.value)} />
        <AdminInput placeholder="Action (masalan: broadcast_created)" value={action} onChange={(e) => setAction(e.target.value)} />
        <div className="mini-responsive-grid-2">
          <AdminInput type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <AdminInput type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
      </AdminCard>
      {loading ? <AdminCard>Yuklanmoqda...</AdminCard> : logs.length === 0 ? (
        <AdminEmptyState icon={<ScrollText size={26} />} title="Audit log bo'sh" text="Actionlar shu yerda ko'rinadi." />
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {logs.map((log) => (
            <AdminCard key={log.id}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <strong>{log.action}</strong>
                <span className="mini-chip">{log.actor_name || "System"}</span>
              </div>
              <p style={{ color: "var(--mini-muted)", fontSize: 13, marginTop: 8 }}>{log.entity_type || "entity"} #{log.entity_id || "-"}</p>
              {log.metadata_json ? <pre className="mini-pre-wrap" style={{ fontSize: 12, color: "var(--mini-muted)", marginTop: 8 }}>{JSON.stringify(log.metadata_json, null, 2)}</pre> : null}
              <div style={{ color: "var(--mini-muted)", fontSize: 12, marginTop: 8 }}>{new Date(log.created_at).toLocaleString("uz-UZ")}</div>
            </AdminCard>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
