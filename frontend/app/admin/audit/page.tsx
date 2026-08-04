"use client";

import { useEffect, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Download, ScrollText } from "lucide-react";
import { AdminButton, AdminCard, AdminEmptyState, AdminErrorState, AdminInput, AdminLoadMoreButton, AdminShell } from "@/components/admin/AdminShell";
import { useRequireSuperadmin } from "@/lib/hooks/useRequireSuperadmin";
import { superadminApi } from "@/lib/api";
import { BASE_URL } from "@/lib/api/client";

type AuditLog = {
  id: number;
  actor_name?: string | null;
  action: string;
  entity_type?: string | null;
  entity_id?: number | null;
  metadata_json?: Record<string, unknown> | null;
  created_at: string;
};

type AuditPage = { items: AuditLog[]; total: number };

const PAGE_SIZE = 30;

export default function AdminAuditPage() {
  const isSuperadmin = useRequireSuperadmin();
  const [q, setQ] = useState("");
  const [action, setAction] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Debounce text filters so every keystroke doesn't hit the API.
  const [debounced, setDebounced] = useState({ q: "", action: "" });
  useEffect(() => {
    const timer = setTimeout(() => setDebounced({ q, action }), 300);
    return () => clearTimeout(timer);
  }, [q, action]);

  const query = useInfiniteQuery<AuditPage>({
    queryKey: ["admin-audit", debounced.q, debounced.action, dateFrom, dateTo],
    queryFn: ({ pageParam }) => superadminApi.getAuditLogs({
      q: debounced.q || undefined,
      action: debounced.action || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      skip: pageParam,
      limit: PAGE_SIZE,
    }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => {
      const loaded = pages.reduce((sum, page) => sum + page.items.length, 0);
      return loaded < lastPage.total ? loaded : undefined;
    },
    placeholderData: (previous) => previous,
  });

  const logs = query.data?.pages.flatMap((page) => page.items) ?? [];
  const total = query.data?.pages[0]?.total ?? 0;

  if (!isSuperadmin) return null;

  return (
    <AdminShell title="Audit log" subtitle={total ? `${total} ta yozuv` : "Muhim admin actionlar tarixi"}>
      <AdminCard style={{ display: "grid", gap: 8, marginBottom: 12 }}>
        <AdminInput placeholder="Qidirish" value={q} onChange={(e) => setQ(e.target.value)} />
        <AdminInput placeholder="Action (masalan: broadcast_created)" value={action} onChange={(e) => setAction(e.target.value)} />
        <div className="mini-responsive-grid-2">
          <AdminInput type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <AdminInput type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
        <AdminButton tone="dark" onClick={() => window.open(`${BASE_URL}/api/v1/admin/export/audit${dateFrom || dateTo ? `?date_from=${dateFrom}&date_to=${dateTo}` : ""}`, "_blank")}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><Download size={15} /> CSV yuklab olish</span>
        </AdminButton>
      </AdminCard>
      {query.isLoading ? <div className="mini-loader mini-loader-sm"><div className="mini-loader-spinner" /><div>Yuklanmoqda...</div></div> : query.isError ? (
        <AdminErrorState onRetry={() => query.refetch()} />
      ) : logs.length === 0 ? (
        <AdminEmptyState icon={<ScrollText size={26} />} title="Audit log bo'sh" text="Actionlar shu yerda ko'rinadi." />
      ) : (
        <>
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
          <AdminLoadMoreButton hasMore={query.hasNextPage} loading={query.isFetchingNextPage} onClick={() => query.fetchNextPage()} />
        </>
      )}
    </AdminShell>
  );
}
