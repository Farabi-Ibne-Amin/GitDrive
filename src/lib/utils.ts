import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { BreadcrumbSegment } from "@/types/drive";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formats a byte count as a human-readable string, e.g. "4.2 MB". */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/** Formats an ISO date string as a relative-ish, friendly date. */
export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  }
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

/** Builds breadcrumb segments from a slash-delimited path. */
export function buildBreadcrumbs(path: string): BreadcrumbSegment[] {
  if (!path) return [];
  const parts = path.split("/").filter(Boolean);
  return parts.map((name, idx) => ({
    name,
    path: parts.slice(0, idx + 1).join("/"),
  }));
}

/** Joins a folder path and a filename, avoiding double slashes. */
export function joinPath(folder: string, name: string): string {
  return folder ? `${folder.replace(/\/+$/, "")}/${name}` : name;
}

/** Reads a browser File as a base64 string (without the data: URL prefix). */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // result looks like "data:application/pdf;base64,JVBERi0x..."
      const base64 = result.split(",")[1] ?? "";
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/** Rough size cutoff (bytes) above which we route uploads through the Git Blob API. */
export const CONTENT_API_THRESHOLD_BYTES = 1 * 1024 * 1024; // 1MB
