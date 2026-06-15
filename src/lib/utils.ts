import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format RWF currency */
export function formatRWF(amount: number): string {
  return new Intl.NumberFormat("rw-RW", {
    style: "currency",
    currency: "RWF",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Format a date for display */
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-RW", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

/** Format datetime */
export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat("en-RW", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

/** Format time only */
export function formatTime(date: string | Date): string {
  return new Intl.DateTimeFormat("en-RW", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

/** Generate a receipt number */
export function generateReceiptNumber(prefix: string = "DEL"): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

/** Generate a random barcode for local products */
export function generateBarcode(): string {
  const prefix = "200"; // RWA local product prefix
  const digits = Array.from({ length: 9 }, () =>
    Math.floor(Math.random() * 10)
  ).join("");
  return prefix + digits;
}

/** Calculate percentage change */
export function percentChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

/** Truncate text */
export function truncate(text: string, length: number): string {
  return text.length > length ? text.substring(0, length) + "…" : text;
}

/** Debounce */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

/** Get initials from name */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
}

/** Rwanda phone number formatter */
export function formatRwandaPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("250")) return `+${cleaned}`;
  if (cleaned.startsWith("07") || cleaned.startsWith("07"))
    return `+250${cleaned.substring(1)}`;
  return `+250${cleaned}`;
}

/** Check if phone is MTN Rwanda */
export function isMTN(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, "").replace(/^250/, "");
  return /^(07[8-9])/.test(cleaned);
}

/** Check if phone is Airtel Rwanda */
export function isAirtel(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, "").replace(/^250/, "");
  return /^(073|072)/.test(cleaned);
}
