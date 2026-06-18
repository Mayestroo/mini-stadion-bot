"use client";
import { TimeSlot } from "@/lib/types";

interface TimeSlotPickerProps {
  slots: TimeSlot[];
  selectedStart?: string;
  selectedEnd?: string;
  onSelect: (start: string, end: string) => void;
}

export function TimeSlotPicker({ slots, selectedStart, selectedEnd, onSelect }: TimeSlotPickerProps) {
  const handleSlotClick = (slot: TimeSlot) => {
    if (!slot.available) return;

    if (!selectedStart) {
      onSelect(slot.time, getNextHour(slot.time));
    } else if (slot.time === selectedStart) {
      onSelect("", "");
    } else if (slot.time > selectedStart) {
      const startIdx = slots.findIndex((s) => s.time === selectedStart);
      const endIdx = slots.findIndex((s) => s.time === slot.time);
      const rangeSlots = slots.slice(startIdx, endIdx + 1);
      const allAvailable = rangeSlots.every((s) => s.available);
      if (allAvailable) {
        onSelect(selectedStart, getNextHour(slot.time));
      }
    } else {
      onSelect(slot.time, getNextHour(slot.time));
    }
  };

  const isInRange = (time: string) => {
    if (!selectedStart || !selectedEnd) return false;
    return time >= selectedStart && time < selectedEnd;
  };

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))",
          gap: 8,
        }}
      >
        {slots.map((slot) => {
          const inRange = isInRange(slot.time);
          const isStart = slot.time === selectedStart;

          return (
            <button
              key={slot.time}
              onClick={() => handleSlotClick(slot)}
              disabled={!slot.available}
              style={{
                padding: "10px 8px",
                borderRadius: "var(--radius-md)",
                border: "1.5px solid",
                fontSize: 14,
                fontWeight: 500,
                cursor: slot.available ? "pointer" : "not-allowed",
                transition: "all 0.15s ease",
                borderColor: !slot.available
                  ? "var(--color-border)"
                  : inRange || isStart
                  ? "var(--color-accent)"
                  : "var(--color-border)",
                backgroundColor: !slot.available
                  ? "var(--color-bg-tertiary)"
                  : inRange || isStart
                  ? "var(--color-accent-light)"
                  : "var(--color-surface)",
                color: !slot.available
                  ? "var(--color-text-tertiary)"
                  : inRange || isStart
                  ? "var(--color-accent)"
                  : "var(--color-text-primary)",
              }}
            >
              {slot.time}
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 16, fontSize: 12, color: "var(--color-text-secondary)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: "var(--color-accent-light)", border: "1.5px solid var(--color-accent)" }} />
          Tanlangan
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: "var(--color-bg-tertiary)" }} />
          Band
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 12, height: 12, borderRadius: 3, border: "1.5px solid var(--color-border)" }} />
          Bo'sh
        </div>
      </div>
    </div>
  );
}

function getNextHour(time: string): string {
  const [h, m] = time.split(":").map(Number);
  return `${(h + 1).toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}
