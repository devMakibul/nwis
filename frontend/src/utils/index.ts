/**
 * cn() utility — merge Tailwind classes cleanly.
 */
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDepth(meters: number): string {
  return `${meters.toLocaleString()}m`;
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

export function getRoleColor(role: string): string {
  switch (role) {
    case "Admin": return "#dc2626";
    case "Drilling Engineer": return "#1d4ed8";
    case "Management": return "#059669";
    default: return "#6b7280";
  }
}
