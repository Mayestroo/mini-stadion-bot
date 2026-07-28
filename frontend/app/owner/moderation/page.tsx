"use client";

import { useQuery } from "@tanstack/react-query";
import { ownerApi } from "@/lib/api";
import { StadiumDraft } from "@/lib/types";
import { OwnerCard, OwnerShell } from "@/components/owner/OwnerShell";

export default function OwnerModerationPage() {
  const { data: drafts = [], isLoading } = useQuery({ queryKey: ["owner-drafts"], queryFn: ownerApi.getDrafts });
  return (
    <OwnerShell>
      <div style={{ display: "grid", gap: 10 }}>
        <OwnerCard><h2 style={{ fontSize: 25, fontWeight: 950, letterSpacing: "-0.04em" }}>Moderatsiya statuslari</h2><p style={{ color: "#627064", marginTop: 4 }}>Yuborilgan stadion o'zgarishlari.</p></OwnerCard>
        {isLoading ? <div className="mini-loader mini-loader-sm"><div className="mini-loader-spinner" /><div>Yuklanmoqda...</div></div> : drafts.length === 0 ? <OwnerCard>Hozircha so'rov yo'q.</OwnerCard> : drafts.map((draft: StadiumDraft) => (
          <OwnerCard key={draft.id}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <div><b>{draft.name}</b><div style={{ color: "#627064", fontSize: 13 }}>{draft.draft_type === "create" ? "Yangi stadion" : "Tahrirlash"}</div></div>
              <StatusBadge status={draft.status} />
            </div>
            {draft.review_note ? <p style={{ marginTop: 10, color: draft.status === "rejected" ? "#d82d24" : "#627064", fontSize: 14 }}>Izoh: {draft.review_note}</p> : null}
          </OwnerCard>
        ))}
      </div>
    </OwnerShell>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color = status === "approved" ? "#19a850" : status === "rejected" ? "#d82d24" : "#c97800";
  return <span style={{ padding: "5px 10px", borderRadius: 999, background: `${color}1f`, color, fontSize: 12, fontWeight: 850 }}>{status}</span>;
}
