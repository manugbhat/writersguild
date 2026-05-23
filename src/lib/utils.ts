import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | { seconds: number }): string {
  const d = date instanceof Date ? date : new Date(date.seconds * 1000);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatRelativeTime(date: Date | { seconds: number }): string {
  const d = date instanceof Date ? date : new Date(date.seconds * 1000);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return formatDate(date);
}

export function getFileIcon(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "📄";
  if (ext === "docx" || ext === "doc") return "📝";
  return "📎";
}
