// Storage keys must match backend/app/schemas/training.py (SPORT_TYPES, AGE_GROUPS).
export const SPORTS: Array<{ value: string; label: string }> = [
  { value: "football", label: "Futbol" },
  { value: "basketball", label: "Basketbol" },
  { value: "volleyball", label: "Voleybol" },
  { value: "tennis", label: "Tennis" },
  { value: "padel", label: "Padel" },
  { value: "badminton", label: "Badminton" },
  { value: "swimming", label: "Suzish" },
  { value: "boxing", label: "Boks" },
  { value: "wrestling", label: "Kurash" },
  { value: "fitness", label: "Fitnes" },
  { value: "gymnastics", label: "Gimnastika" },
  { value: "chess", label: "Shaxmat" },
  { value: "other", label: "Boshqa" },
];

export const AGE_GROUPS: Array<{ value: string; label: string }> = [
  { value: "kids", label: "Bolalar" },
  { value: "teens", label: "O'smirlar" },
  { value: "adults", label: "Kattalar" },
  { value: "all", label: "Barcha yosh" },
];

export function sportLabel(value?: string): string {
  return SPORTS.find((s) => s.value === value)?.label || value || "—";
}

export function ageGroupLabel(value?: string): string {
  return AGE_GROUPS.find((a) => a.value === value)?.label || value || "—";
}
