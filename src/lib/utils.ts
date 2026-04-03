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
