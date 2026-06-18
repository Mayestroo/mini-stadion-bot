# 03 — Frontend (Next.js 14) — To'liq Kod

## Papka Tuzilishi

```
frontend/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                    ← Bosh sahifa
│   ├── globals.css
│   ├── stadionlar/
│   │   ├── page.tsx               ← Stadionlar ro'yxati
│   │   └── [slug]/
│   │       └── page.tsx           ← Stadion detail
│   ├── bron/
│   │   ├── page.tsx               ← Bron qilish
│   │   └── [code]/
│   │       └── page.tsx           ← Bron detail
│   ├── profil/
│   │   └── page.tsx               ← Foydalanuvchi profili
│   ├── admin/
│   │   ├── layout.tsx
│   │   ├── page.tsx               ← Dashboard
│   │   ├── stadionlar/
│   │   │   ├── page.tsx
│   │   │   └── yangi/page.tsx
│   │   └── bronlar/
│   │       └── page.tsx
│   ├── login/
│   │   └── page.tsx
│   └── register/
│       └── page.tsx
├── components/
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Badge.tsx
│   │   ├── Modal.tsx
│   │   ├── Toast.tsx
│   │   └── Spinner.tsx
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   └── Sidebar.tsx
│   ├── stadium/
│   │   ├── StadiumCard.tsx
│   │   ├── StadiumGrid.tsx
│   │   ├── StadiumMap.tsx
│   │   ├── StadiumGallery.tsx
│   │   ├── StadiumAmenities.tsx
│   │   └── StadiumFilter.tsx
│   └── booking/
│       ├── BookingForm.tsx
│       ├── TimeSlotPicker.tsx
│       ├── BookingCard.tsx
│       └── BookingStatus.tsx
├── lib/
│   ├── api.ts
│   ├── auth.ts
│   ├── utils.ts
│   └── types.ts
├── store/
│   └── auth.ts
├── hooks/
│   ├── useStadiums.ts
│   └── useBookings.ts
└── public/
    └── icons/
```

---

## `frontend/app/globals.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Apple Design System — Minimalist */
:root {
  /* Colors — SF System Palette */
  --color-bg: #FFFFFF;
  --color-bg-secondary: #F5F5F7;
  --color-bg-tertiary: #EBEBED;
  --color-surface: #FFFFFF;
  --color-border: rgba(0, 0, 0, 0.08);
  --color-border-strong: rgba(0, 0, 0, 0.16);

  /* Text */
  --color-text-primary: #1D1D1F;
  --color-text-secondary: #6E6E73;
  --color-text-tertiary: #AEAEB2;
  --color-text-inverse: #FFFFFF;

  /* Accent — Yashil (futbol) */
  --color-accent: #34C759;
  --color-accent-hover: #2EB350;
  --color-accent-light: rgba(52, 199, 89, 0.12);

  /* Status */
  --color-error: #FF3B30;
  --color-warning: #FF9500;
  --color-success: #34C759;
  --color-info: #007AFF;

  /* Spacing & Radius */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 20px;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06);
  --shadow-md: 0 4px 16px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04);
  --shadow-lg: 0 8px 32px rgba(0,0,0,0.10), 0 4px 8px rgba(0,0,0,0.06);

  /* Typography */
  --font-sans: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Segoe UI', system-ui, sans-serif;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  scroll-behavior: smooth;
  -webkit-font-smoothing: antialiased;
}

body {
  font-family: var(--font-sans);
  background-color: var(--color-bg-secondary);
  color: var(--color-text-primary);
  line-height: 1.5;
}

/* Scrollbar */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--color-border-strong); border-radius: 3px; }
```

---

## `frontend/app/layout.tsx`

```tsx
import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { ToastProvider } from "@/components/providers/ToastProvider";

export const metadata: Metadata = {
  title: {
    default: "Andijan Futbol — Mini Stadionlar",
    template: "%s | Andijan Futbol",
  },
  description: "Andijondagi mini futbol stadionlarini toping va online bron qiling",
  keywords: ["andijan", "futbol", "mini stadion", "bron", "sport"],
  openGraph: {
    title: "Andijan Futbol",
    description: "Andijondagi mini futbol stadionlarini toping va online bron qiling",
    locale: "uz_UZ",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz">
      <body>
        <QueryProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
```

---

## `frontend/lib/types.ts`

```typescript
export interface Stadium {
  id: number;
  name: string;
  slug: string;
  description?: string;
  address: string;
  district?: string;
  latitude?: number;
  longitude?: number;
  phone: string;
  phone2?: string;
  telegram?: string;
  price_per_hour: number;
  price_weekend?: number;
  price_night?: number;
  width?: number;
  length?: number;
  surface?: string;
  has_lighting: boolean;
  has_changing_room: boolean;
  has_shower: boolean;
  has_parking: boolean;
  has_cafe: boolean;
  has_tribunes: boolean;
  open_time: string;
  close_time: string;
  working_days: number[];
  cover_image?: string;
  images: string[];
  is_active: boolean;
  is_featured: boolean;
  rating: number;
  total_bookings: number;
  created_at: string;
}

export interface Booking {
  id: number;
  booking_code: string;
  stadium_id: number;
  stadium_name: string;
  user_id: number;
  user_name: string;
  user_phone: string;
  date: string;
  start_time: string;
  end_time: string;
  duration_hours: number;
  total_price: number;
  status: "pending" | "confirmed" | "cancelled" | "completed" | "no_show";
  note?: string;
  admin_note?: string;
  created_at: string;
}

export interface User {
  id: number;
  full_name: string;
  phone: string;
  email?: string;
  role: "guest" | "user" | "admin" | "superadmin";
  is_active: boolean;
  telegram_id?: string;
  avatar_url?: string;
  created_at: string;
}

export interface TimeSlot {
  time: string;
  available: boolean;
  booking_id?: number;
}

export interface AvailabilityResponse {
  date: string;
  stadium_id: number;
  slots: TimeSlot[];
}
```

---

## `frontend/lib/api.ts`

```typescript
import axios from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  headers: { "Content-Type": "application/json" },
});

// Token interceptor
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Error interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("access_token");
        localStorage.removeItem("user");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// ─── Auth ─────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data: { full_name: string; phone: string; password: string; email?: string }) =>
    api.post("/auth/register", data).then((r) => r.data),

  login: (data: { phone: string; password: string }) =>
    api.post("/auth/login", data).then((r) => r.data),
};

// ─── Stadiums ─────────────────────────────────────────────────────────────
export const stadiumApi = {
  getAll: (params?: Record<string, any>) =>
    api.get("/stadiums/", { params }).then((r) => r.data),

  getOne: (slug: string) =>
    api.get(`/stadiums/${slug}`).then((r) => r.data),

  getAvailability: (stadiumId: number, date: string) =>
    api.get(`/stadiums/${stadiumId}/availability`, { params: { date } }).then((r) => r.data),

  create: (data: any) =>
    api.post("/stadiums/", data).then((r) => r.data),

  update: (id: number, data: any) =>
    api.put(`/stadiums/${id}`, data).then((r) => r.data),

  delete: (id: number) =>
    api.delete(`/stadiums/${id}`).then((r) => r.data),

  uploadImages: (stadiumId: number, files: File[]) => {
    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));
    return api.post(`/uploads/stadium/${stadiumId}/images`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data);
  },
};

// ─── Bookings ─────────────────────────────────────────────────────────────
export const bookingApi = {
  create: (data: { stadium_id: number; date: string; start_time: string; end_time: string; note?: string }) =>
    api.post("/bookings/", data).then((r) => r.data),

  getMyBookings: () =>
    api.get("/bookings/my").then((r) => r.data),

  getOne: (code: string) =>
    api.get(`/bookings/${code}`).then((r) => r.data),

  cancel: (id: number) =>
    api.patch(`/bookings/${id}/cancel`).then((r) => r.data),

  // Admin
  getAllAdmin: (params?: Record<string, any>) =>
    api.get("/bookings/admin/all", { params }).then((r) => r.data),

  updateStatus: (id: number, status: string, adminNote?: string) =>
    api.patch(`/bookings/admin/${id}/status`, { status, admin_note: adminNote }).then((r) => r.data),
};

export function getImageUrl(path?: string): string {
  if (!path) return "/images/stadium-placeholder.jpg";
  if (path.startsWith("http")) return path;
  return `${BASE_URL}${path}`;
}
```

---

## `frontend/lib/utils.ts`

```typescript
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
```

---

## `frontend/store/auth.ts`

```typescript
import { create } from "zustand";
import { User } from "@/lib/types";

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: typeof window !== "undefined"
    ? JSON.parse(localStorage.getItem("user") || "null")
    : null,
  token: typeof window !== "undefined"
    ? localStorage.getItem("access_token")
    : null,
  isAuthenticated: typeof window !== "undefined"
    ? !!localStorage.getItem("access_token")
    : false,

  login: (user, token) => {
    localStorage.setItem("access_token", token);
    localStorage.setItem("user", JSON.stringify(user));
    set({ user, token, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    set({ user: null, token: null, isAuthenticated: false });
  },

  setUser: (user) => {
    localStorage.setItem("user", JSON.stringify(user));
    set({ user });
  },
}));
```

---

## `frontend/components/layout/Header.tsx`

```tsx
"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useAuthStore } from "@/store/auth";
import { Menu, X, User, LogOut, Settings } from "lucide-react";

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const navLinks = [
    { href: "/stadionlar", label: "Stadionlar" },
    { href: "/bron", label: "Bron" },
  ];

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        backgroundColor: "rgba(255,255,255,0.85)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--color-border)",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "0 20px",
          height: 60,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Logo */}
        <Link
          href="/"
          style={{
            fontWeight: 700,
            fontSize: 18,
            color: "var(--color-text-primary)",
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ fontSize: 22 }}>⚽</span>
          <span>Andijan Futbol</span>
        </Link>

        {/* Desktop Nav */}
        <nav style={{ display: "flex", alignItems: "center", gap: 8 }} className="hidden md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              style={{
                padding: "8px 16px",
                borderRadius: "var(--radius-full)",
                fontSize: 15,
                fontWeight: 500,
                textDecoration: "none",
                color: pathname === link.href ? "var(--color-accent)" : "var(--color-text-secondary)",
                backgroundColor: pathname === link.href ? "var(--color-accent-light)" : "transparent",
                transition: "all 0.15s ease",
              }}
            >
              {link.label}
            </Link>
          ))}

          {isAuthenticated ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 8 }}>
              {user?.role === "admin" || user?.role === "superadmin" ? (
                <Link
                  href="/admin"
                  style={{
                    padding: "8px 16px",
                    borderRadius: "var(--radius-full)",
                    fontSize: 14,
                    fontWeight: 500,
                    textDecoration: "none",
                    color: "var(--color-accent)",
                    border: "1px solid var(--color-accent)",
                  }}
                >
                  Admin
                </Link>
              ) : null}
              <Link
                href="/profil"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 16px",
                  borderRadius: "var(--radius-full)",
                  fontSize: 14,
                  fontWeight: 500,
                  textDecoration: "none",
                  color: "var(--color-text-primary)",
                  backgroundColor: "var(--color-bg-secondary)",
                }}
              >
                <User size={15} />
                {user?.full_name?.split(" ")[0]}
              </Link>
              <button
                onClick={handleLogout}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "8px",
                  borderRadius: "var(--radius-full)",
                  border: "none",
                  backgroundColor: "transparent",
                  color: "var(--color-text-secondary)",
                  cursor: "pointer",
                }}
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8, marginLeft: 8 }}>
              <Link
                href="/login"
                style={{
                  padding: "8px 20px",
                  borderRadius: "var(--radius-full)",
                  fontSize: 14,
                  fontWeight: 500,
                  textDecoration: "none",
                  color: "var(--color-text-primary)",
                  backgroundColor: "var(--color-bg-secondary)",
                }}
              >
                Kirish
              </Link>
              <Link
                href="/register"
                style={{
                  padding: "8px 20px",
                  borderRadius: "var(--radius-full)",
                  fontSize: 14,
                  fontWeight: 600,
                  textDecoration: "none",
                  color: "white",
                  backgroundColor: "var(--color-accent)",
                }}
              >
                Ro'yxat
              </Link>
            </div>
          )}
        </nav>

        {/* Mobile burger */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden"
          style={{
            border: "none",
            background: "none",
            cursor: "pointer",
            padding: 8,
            color: "var(--color-text-primary)",
          }}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          style={{
            backgroundColor: "var(--color-surface)",
            borderTop: "1px solid var(--color-border)",
            padding: "12px 20px 20px",
          }}
          className="md:hidden"
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              style={{
                display: "block",
                padding: "14px 0",
                fontSize: 16,
                fontWeight: 500,
                color: "var(--color-text-primary)",
                textDecoration: "none",
                borderBottom: "1px solid var(--color-border)",
              }}
            >
              {link.label}
            </Link>
          ))}
          {isAuthenticated ? (
            <>
              <Link href="/profil" onClick={() => setMenuOpen(false)} style={{ display: "block", padding: "14px 0", fontSize: 16, color: "var(--color-text-primary)", textDecoration: "none", borderBottom: "1px solid var(--color-border)" }}>
                Profil
              </Link>
              <button onClick={() => { handleLogout(); setMenuOpen(false); }} style={{ width: "100%", textAlign: "left", padding: "14px 0", fontSize: 16, color: "var(--color-error)", border: "none", background: "none", cursor: "pointer" }}>
                Chiqish
              </button>
            </>
          ) : (
            <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
              <Link href="/login" onClick={() => setMenuOpen(false)} style={{ flex: 1, padding: "12px", textAlign: "center", borderRadius: "var(--radius-md)", backgroundColor: "var(--color-bg-secondary)", color: "var(--color-text-primary)", textDecoration: "none", fontWeight: 500 }}>Kirish</Link>
              <Link href="/register" onClick={() => setMenuOpen(false)} style={{ flex: 1, padding: "12px", textAlign: "center", borderRadius: "var(--radius-md)", backgroundColor: "var(--color-accent)", color: "white", textDecoration: "none", fontWeight: 600 }}>Ro'yxat</Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
```

---

## `frontend/components/stadium/StadiumCard.tsx`

```tsx
import Link from "next/link";
import { Stadium } from "@/lib/types";
import { formatPrice, getSurfaceLabel } from "@/lib/utils";
import { getImageUrl } from "@/lib/api";
import { Phone, MapPin, Star, Zap, ParkingCircle, Shower } from "lucide-react";

interface StadiumCardProps {
  stadium: Stadium;
}

export function StadiumCard({ stadium }: StadiumCardProps) {
  return (
    <Link
      href={`/stadionlar/${stadium.slug}`}
      style={{ textDecoration: "none", display: "block" }}
    >
      <div
        style={{
          backgroundColor: "var(--color-surface)",
          borderRadius: "var(--radius-xl)",
          overflow: "hidden",
          boxShadow: "var(--shadow-sm)",
          border: "1px solid var(--color-border)",
          transition: "transform 0.2s ease, box-shadow 0.2s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.boxShadow = "var(--shadow-md)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "var(--shadow-sm)";
        }}
      >
        {/* Rasm */}
        <div style={{ position: "relative", height: 200, overflow: "hidden", backgroundColor: "var(--color-bg-tertiary)" }}>
          <img
            src={getImageUrl(stadium.cover_image)}
            alt={stadium.name}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={(e) => { (e.target as HTMLImageElement).src = "/images/stadium-placeholder.jpg"; }}
          />
          {stadium.is_featured && (
            <span
              style={{
                position: "absolute",
                top: 12,
                left: 12,
                backgroundColor: "var(--color-accent)",
                color: "white",
                fontSize: 11,
                fontWeight: 700,
                padding: "4px 10px",
                borderRadius: "var(--radius-full)",
                letterSpacing: "0.05em",
              }}
            >
              TOP
            </span>
          )}
          <div
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              display: "flex",
              alignItems: "center",
              gap: 4,
              backgroundColor: "rgba(0,0,0,0.6)",
              color: "white",
              padding: "4px 10px",
              borderRadius: "var(--radius-full)",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <Star size={12} fill="white" />
            {stadium.rating.toFixed(1)}
          </div>
        </div>

        {/* Ma'lumot */}
        <div style={{ padding: "16px" }}>
          <h3
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: "var(--color-text-primary)",
              marginBottom: 4,
              letterSpacing: "-0.01em",
            }}
          >
            {stadium.name}
          </h3>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              color: "var(--color-text-secondary)",
              fontSize: 13,
              marginBottom: 12,
            }}
          >
            <MapPin size={13} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {stadium.address}
            </span>
          </div>

          {/* Imkoniyatlar */}
          <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
            {stadium.has_lighting && (
              <AmenityBadge icon={<Zap size={11} />} label="Chiroq" />
            )}
            {stadium.has_parking && (
              <AmenityBadge icon={<ParkingCircle size={11} />} label="Parking" />
            )}
            {stadium.has_shower && (
              <AmenityBadge icon={<Shower size={11} />} label="Dush" />
            )}
            <AmenityBadge label={getSurfaceLabel(stadium.surface)} />
          </div>

          {/* Narx va telefon */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <span style={{ fontSize: 18, fontWeight: 700, color: "var(--color-accent)" }}>
                {formatPrice(stadium.price_per_hour)}
              </span>
              <span style={{ fontSize: 12, color: "var(--color-text-secondary)", marginLeft: 4 }}>/ soat</span>
            </div>
            <a
              href={`tel:${stadium.phone}`}
              onClick={(e) => e.stopPropagation()}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                color: "var(--color-info)",
                fontSize: 13,
                fontWeight: 500,
                textDecoration: "none",
              }}
            >
              <Phone size={13} />
              {stadium.phone}
            </a>
          </div>
        </div>
      </div>
    </Link>
  );
}

function AmenityBadge({ icon, label }: { icon?: React.ReactNode; label: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: 11,
        fontWeight: 500,
        color: "var(--color-text-secondary)",
        backgroundColor: "var(--color-bg-secondary)",
        padding: "3px 8px",
        borderRadius: "var(--radius-full)",
      }}
    >
      {icon}
      {label}
    </span>
  );
}
```

---

## `frontend/components/booking/TimeSlotPicker.tsx`

```tsx
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
      // Range tanlash
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
```

---

## `frontend/app/stadionlar/page.tsx`

```tsx
import { Header } from "@/components/layout/Header";
import { StadiumsListClient } from "./StadiumsListClient";

export const metadata = { title: "Stadionlar" };

export default function StadiumsPage() {
  return (
    <>
      <Header />
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 20px" }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "var(--color-text-primary)", letterSpacing: "-0.02em" }}>
            Mini Futbol Stadionlari
          </h1>
          <p style={{ fontSize: 15, color: "var(--color-text-secondary)", marginTop: 6 }}>
            Andijondagi barcha mini futbol maydonlari
          </p>
        </div>
        <StadiumsListClient />
      </main>
    </>
  );
}
```

---

## `frontend/app/stadionlar/StadiumsListClient.tsx`

```tsx
"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { stadiumApi } from "@/lib/api";
import { StadiumCard } from "@/components/stadium/StadiumCard";
import { Search, SlidersHorizontal } from "lucide-react";

export function StadiumsListClient() {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({
    has_lighting: undefined as boolean | undefined,
    has_parking: undefined as boolean | undefined,
    min_price: undefined as number | undefined,
    max_price: undefined as number | undefined,
  });

  const { data: stadiums = [], isLoading } = useQuery({
    queryKey: ["stadiums", search, filters],
    queryFn: () => stadiumApi.getAll({ search: search || undefined, ...filters }),
  });

  return (
    <div>
      {/* Qidiruv */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          backgroundColor: "var(--color-surface)",
          border: "1.5px solid var(--color-border)",
          borderRadius: "var(--radius-xl)",
          padding: "12px 16px",
          marginBottom: 20,
        }}
      >
        <Search size={18} color="var(--color-text-tertiary)" />
        <input
          type="text"
          placeholder="Stadion nomi yoki manzil..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            fontSize: 15,
            color: "var(--color-text-primary)",
            backgroundColor: "transparent",
          }}
        />
      </div>

      {/* Filter tugmalari */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        <FilterChip
          label="Chiroq"
          active={filters.has_lighting === true}
          onClick={() => setFilters((f) => ({ ...f, has_lighting: f.has_lighting ? undefined : true }))}
        />
        <FilterChip
          label="Parking"
          active={filters.has_parking === true}
          onClick={() => setFilters((f) => ({ ...f, has_parking: f.has_parking ? undefined : true }))}
        />
        <FilterChip
          label="100K gacha"
          active={filters.max_price === 100000}
          onClick={() => setFilters((f) => ({ ...f, max_price: f.max_price ? undefined : 100000 }))}
        />
        <FilterChip
          label="200K gacha"
          active={filters.max_price === 200000}
          onClick={() => setFilters((f) => ({ ...f, max_price: f.max_price === 200000 ? undefined : 200000 }))}
        />
      </div>

      {/* Stadionlar */}
      {isLoading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} style={{ height: 340, borderRadius: "var(--radius-xl)", backgroundColor: "var(--color-bg-tertiary)", animation: "pulse 1.5s infinite" }} />
          ))}
        </div>
      ) : stadiums.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--color-text-secondary)" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚽</div>
          <p style={{ fontSize: 18, fontWeight: 600, color: "var(--color-text-primary)" }}>Stadion topilmadi</p>
          <p style={{ fontSize: 14, marginTop: 8 }}>Filtrlarni o'zgartiring</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
          {stadiums.map((stadium: any) => (
            <StadiumCard key={stadium.id} stadium={stadium} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 16px",
        borderRadius: "var(--radius-full)",
        fontSize: 13,
        fontWeight: 500,
        border: "1.5px solid",
        cursor: "pointer",
        transition: "all 0.15s ease",
        borderColor: active ? "var(--color-accent)" : "var(--color-border)",
        backgroundColor: active ? "var(--color-accent-light)" : "var(--color-surface)",
        color: active ? "var(--color-accent)" : "var(--color-text-secondary)",
      }}
    >
      {label}
    </button>
  );
}
```

---

## `frontend/app/page.tsx` (Bosh Sahifa)

```tsx
import Link from "next/link";
import { Header } from "@/components/layout/Header";

export default function HomePage() {
  return (
    <>
      <Header />

      {/* Hero */}
      <section
        style={{
          background: "linear-gradient(135deg, #0a1628 0%, #1a2f4e 100%)",
          padding: "80px 20px 100px",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background pattern */}
        <div style={{ position: "absolute", inset: 0, opacity: 0.04, backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

        <div style={{ position: "relative", maxWidth: 700, margin: "0 auto" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              backgroundColor: "rgba(52,199,89,0.15)",
              border: "1px solid rgba(52,199,89,0.3)",
              color: "#34C759",
              padding: "6px 16px",
              borderRadius: "var(--radius-full)",
              fontSize: 13,
              fontWeight: 600,
              marginBottom: 24,
              letterSpacing: "0.05em",
            }}
          >
            ⚡ ANDIJAN · MINI FUTBOL
          </div>

          <h1
            style={{
              fontSize: "clamp(36px, 6vw, 64px)",
              fontWeight: 800,
              color: "white",
              lineHeight: 1.1,
              letterSpacing: "-0.03em",
              marginBottom: 20,
            }}
          >
            O'yin maydoni —
            <br />
            <span style={{ color: "#34C759" }}>bir zumda bron</span>
          </h1>

          <p
            style={{
              fontSize: 18,
              color: "rgba(255,255,255,0.65)",
              lineHeight: 1.6,
              marginBottom: 36,
              maxWidth: 500,
              margin: "0 auto 36px",
            }}
          >
            Andijondagi mini futbol stadionlarini toping, narxlarni solishtiring va online bron qiling
          </p>

          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link
              href="/stadionlar"
              style={{
                padding: "16px 32px",
                borderRadius: "var(--radius-full)",
                fontSize: 16,
                fontWeight: 700,
                textDecoration: "none",
                color: "white",
                backgroundColor: "var(--color-accent)",
                boxShadow: "0 4px 20px rgba(52,199,89,0.4)",
              }}
            >
              Stadionlarni ko'rish
            </Link>
            <a
              href="https://t.me/andijanfutbol_bot"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: "16px 32px",
                borderRadius: "var(--radius-full)",
                fontSize: 16,
                fontWeight: 600,
                textDecoration: "none",
                color: "white",
                backgroundColor: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.2)",
              }}
            >
              Telegram Bot
            </a>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section style={{ backgroundColor: "var(--color-surface)", borderBottom: "1px solid var(--color-border)" }}>
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "32px 20px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: 24,
            textAlign: "center",
          }}
        >
          {[
            { value: "5+", label: "Stadion" },
            { value: "24/7", label: "Bron qilish" },
            { value: "100%", label: "Online" },
            { value: "0", label: "Komissiya" },
          ].map((stat) => (
            <div key={stat.label}>
              <div style={{ fontSize: 32, fontWeight: 800, color: "var(--color-accent)", letterSpacing: "-0.03em" }}>{stat.value}</div>
              <div style={{ fontSize: 14, color: "var(--color-text-secondary)", marginTop: 4 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Stadiums section ... */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 24 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em" }}>Top Stadionlar</h2>
          <Link href="/stadionlar" style={{ fontSize: 14, color: "var(--color-accent)", textDecoration: "none", fontWeight: 500 }}>
            Barchasi →
          </Link>
        </div>
        {/* FeaturedStadiums component shu yerda */}
        <FeaturedStadiumsPlaceholder />
      </section>

      {/* Footer */}
      <footer style={{ backgroundColor: "var(--color-text-primary)", color: "white", padding: "40px 20px", marginTop: 40 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>⚽ Andijan Futbol</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>© 2025 Andijan Futbol. Barcha huquqlar himoyalangan.</div>
          </div>
          <div style={{ display: "flex", gap: 24 }}>
            <a href="https://t.me/andijanfutbol_bot" target="_blank" rel="noopener noreferrer" style={{ color: "rgba(255,255,255,0.7)", textDecoration: "none", fontSize: 14 }}>Telegram Bot</a>
            <Link href="/stadionlar" style={{ color: "rgba(255,255,255,0.7)", textDecoration: "none", fontSize: 14 }}>Stadionlar</Link>
            <Link href="/admin" style={{ color: "rgba(255,255,255,0.7)", textDecoration: "none", fontSize: 14 }}>Admin</Link>
          </div>
        </div>
      </footer>
    </>
  );
}

function FeaturedStadiumsPlaceholder() {
  // Bu yerda useQuery bilan featured stadionlar keladi
  // Haqiqiy implementatsiya: FeaturedStadiumsClient component yasang
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
      {[...Array(3)].map((_, i) => (
        <div key={i} style={{ height: 300, borderRadius: "var(--radius-xl)", backgroundColor: "var(--color-bg-tertiary)" }} />
      ))}
    </div>
  );
}
```

---

## `frontend/components/providers/QueryProvider.tsx`

```tsx
"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      })
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
```

---

## `frontend/tailwind.config.ts`

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      screens: {
        xs: "375px",
      },
    },
  },
  plugins: [],
};

export default config;
```

---

## `frontend/next.config.ts`

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    domains: ["localhost", "yourdomain.com"],
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "8000",
        pathname: "/uploads/**",
      },
    ],
  },
};

export default nextConfig;
```
