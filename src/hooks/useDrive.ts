"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import toast from "react-hot-toast";
import type { DriveEntry, DriveRepo } from "@/types/drive";
import {
  CONTENT_API_THRESHOLD_BYTES,
  fileToBase64,
  joinPath,
} from "@/lib/utils";
import { GITHUB_HARD_FILE_LIMIT_MB } from "@/lib/env.client";

// ---------------------------------------------------------------------------
// Small fetch wrapper that surfaces our API's { error } shape as thrown
// Errors, so React Query's error state / onError handlers work naturally.
// ---------------------------------------------------------------------------
async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message =
      typeof data.error === "string"
        ? data.error
        : JSON.stringify(data.error) || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data as T;
}

// ---------------------------------------------------------------------------
// Repos
// ---------------------------------------------------------------------------

export function useRepos() {
  return useQuery({
    queryKey: ["repos"],
    queryFn: () => api<{ repos: DriveRepo[] }>("/api/repos"),
    select: (data) => data.repos,
  });
}

export function useCreateRepo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; private: boolean; description?: string }) =>
      api<{ repo: DriveRepo }>("/api/repos", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["repos"] });
      toast.success("Storage repository created!");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ---------------------------------------------------------------------------
// Directory listing
// ---------------------------------------------------------------------------

export function useDirectory(owner: string, repo: string, path: string) {
  return useQuery({
    queryKey: ["files", owner, repo, path],
    queryFn: () =>
      api<{ path: string; entries: DriveEntry[] }>(
        `/api/files?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(
          repo
        )}&path=${encodeURIComponent(path)}`
      ),
    select: (data) => data.entries,
    enabled: Boolean(owner && repo),
  });
}

// ---------------------------------------------------------------------------
// Upload — automatically routes to Content API (<1MB) or Blob API (>=1MB)
// ---------------------------------------------------------------------------

export interface UploadTarget {
  owner: string;
  repo: string;
  folderPath: string;
}

export interface UploadProgressState {
  fileName: string;
  status: "pending" | "uploading" | "done" | "error";
  errorMessage?: string;
}

export function useUploadFiles(
  target: UploadTarget,
  onProgress?: (state: UploadProgressState) => void
) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (files: File[]) => {
      const results: { file: File; error?: string }[] = [];

      for (const file of files) {
        onProgress?.({ fileName: file.name, status: "uploading" });

        const sizeMb = file.size / (1024 * 1024);
        if (sizeMb > GITHUB_HARD_FILE_LIMIT_MB) {
          const errorMessage = `"${file.name}" is ${sizeMb.toFixed(
            1
          )}MB, over GitHub's ${GITHUB_HARD_FILE_LIMIT_MB}MB per-file limit.`;
          onProgress?.({ fileName: file.name, status: "error", errorMessage });
          results.push({ file, error: errorMessage });
          continue;
        }

        try {
          const contentBase64 = await fileToBase64(file);
          const path = joinPath(target.folderPath, file.name);
          const endpoint =
            file.size >= CONTENT_API_THRESHOLD_BYTES
              ? "/api/files/upload"
              : "/api/files";

          await api(endpoint, {
            method: "POST",
            body: JSON.stringify({
              owner: target.owner,
              repo: target.repo,
              path,
              contentBase64,
              message: `Upload ${file.name} via GitDrive`,
            }),
          });

          onProgress?.({ fileName: file.name, status: "done" });
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : "Upload failed";
          onProgress?.({ fileName: file.name, status: "error", errorMessage });
          results.push({ file, error: errorMessage });
        }
      }

      return results;
    },
    onSuccess: (results) => {
      qc.invalidateQueries({
        queryKey: ["files", target.owner, target.repo, target.folderPath],
      });
      const failed = results.filter((r) => r.error);
      if (failed.length === 0) {
        toast.success("Upload complete!");
      } else {
        toast.error(`${failed.length} file(s) failed to upload.`);
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ---------------------------------------------------------------------------
// Create folder
// ---------------------------------------------------------------------------

export function useCreateFolder(owner: string, repo: string, parentPath: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (folderName: string) =>
      api("/api/files/folder", {
        method: "POST",
        body: JSON.stringify({
          owner,
          repo,
          path: joinPath(parentPath, folderName),
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["files", owner, repo, parentPath] });
      toast.success("Folder created.");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ---------------------------------------------------------------------------
// Delete file / folder
// ---------------------------------------------------------------------------

export function useDeleteEntry(owner: string, repo: string, currentPath: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (entry: DriveEntry) =>
      api("/api/files", {
        method: "DELETE",
        body: JSON.stringify({
          owner,
          repo,
          path: entry.path,
          sha: entry.sha,
          isDirectory: entry.type === "dir",
        }),
      }),
    onSuccess: (_data, entry) => {
      qc.invalidateQueries({ queryKey: ["files", owner, repo, currentPath] });
      toast.success(`"${entry.name}" deleted.`);
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ---------------------------------------------------------------------------
// Rename
// ---------------------------------------------------------------------------

export function useRenameEntry(owner: string, repo: string, currentPath: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { fromPath: string; toPath: string }) =>
      api("/api/files/rename", {
        method: "POST",
        body: JSON.stringify({ owner, repo, ...input }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["files", owner, repo, currentPath] });
      toast.success("Renamed.");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
