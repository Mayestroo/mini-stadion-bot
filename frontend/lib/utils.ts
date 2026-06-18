export function formatPrice(amount: number): string {
  return new Intl.NumberFormat("uz-UZ").format(amount) + " so'm";
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("uz-UZ", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatDateShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("uz-UZ", {
    month: "short",
    day: "numeric",
  });
}

export function getDayName(dayIndex: number): string {
  const days = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"];
  return days[dayIndex];
}

export function getDayFullName(dayIndex: number): string {
  const days = ["Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba", "Yakshanba"];
  return days[dayIndex];
}

export function getBookingStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: "Kutilmoqda",
    confirmed: "Tasdiqlangan",
    cancelled: "Bekor qilingan",
    completed: "Tugallangan",
    no_show: "Kelmadi",
  };
  return labels[status] || status;
}

export function getBookingStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    confirmed: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
    completed: "bg-blue-100 text-blue-700",
    no_show: "bg-gray-100 text-gray-600",
  };
  return colors[status] || "bg-gray-100 text-gray-600";
}

export function getSurfaceLabel(surface?: string): string {
  const labels: Record<string, string> = {
    artificial: "Sun'iy o't",
    grass: "Tabiiy o't",
    concrete: "Beton",
  };
  return labels[surface || ""] || surface || "—";
}

export function cn(...classes: (string | undefined | null | boolean)[]): string {
  return classes.filter(Boolean).join(" ");
}
