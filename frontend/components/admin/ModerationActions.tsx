"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminButton, AdminInput } from "./AdminShell";

/**
 * Shared state machine for the four moderation queues (stadiums, trainings,
 * images, cancel-requests): approve-with-confirm + reject-with-mandatory-note.
 */
export function useModerationActions({ approveFn, rejectFn, queryKey }: {
  approveFn: (id: number) => Promise<unknown>;
  rejectFn: (id: number, note?: string) => Promise<unknown>;
  queryKey: string[];
}) {
  const queryClient = useQueryClient();
  const [rejectNote, setRejectNote] = useState("");
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [approvingId, setApprovingId] = useState<number | null>(null);

  const approve = useMutation({
    mutationFn: (id: number) => approveFn(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setApprovingId(null);
    },
  });
  const reject = useMutation({
    mutationFn: (id: number) => rejectFn(id, rejectNote.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setRejectingId(null);
      setRejectNote("");
    },
  });

  return { approve, reject, rejectNote, setRejectNote, rejectingId, setRejectingId, approvingId, setApprovingId };
}

export function ModerationActionButtons({ pending, rejectNote, rejecting, busy, onApprove, onToggleReject, onNoteChange, onReject }: {
  pending: boolean;
  rejectNote: string;
  rejecting: boolean;
  busy?: boolean;
  onApprove: () => void;
  onToggleReject: () => void;
  onNoteChange: (value: string) => void;
  onReject: () => void;
}) {
  if (!pending) return null;
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <AdminButton onClick={onApprove}>Approve</AdminButton>
        <AdminButton tone="red" onClick={onToggleReject}>
          {rejecting ? "Bekor qilish" : "Reject"}
        </AdminButton>
      </div>
      {rejecting ? (
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <AdminInput placeholder="Rad etish sababi (majburiy)" value={rejectNote} onChange={(e) => onNoteChange(e.target.value)} maxLength={500} />
          <AdminButton tone="red" disabled={!rejectNote.trim() || busy} onClick={onReject}>Tasdiqlash</AdminButton>
        </div>
      ) : null}
    </div>
  );
}
