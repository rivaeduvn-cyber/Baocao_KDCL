import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("vi-VN");
}

export function getSessionLabel(session: string): string {
  return session === "MORNING" ? "Sáng" : "Chiều";
}

export function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    PRESENT: "Có mặt",
    ABSENT: "Vắng",
    LATE: "Trễ",
    LEAVE: "Nghỉ phép",
  };
  return map[status] || status;
}

export function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function getTodayString(): string {
  const now = new Date();
  return now.toISOString().split("T")[0];
}

/** Editable window for employee self-edit (admin bypasses). */
export const EDIT_WINDOW_DAYS = 3;

/** True if a record dated `date` (YYYY-MM-DD) is still within the edit window. */
export function isWithinEditWindow(date: string, days: number = EDIT_WINDOW_DAYS): boolean {
  const recordTime = new Date(date + "T00:00:00").getTime();
  if (Number.isNaN(recordTime)) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = (today.getTime() - recordTime) / (1000 * 60 * 60 * 24);
  return diffDays <= days;
}
