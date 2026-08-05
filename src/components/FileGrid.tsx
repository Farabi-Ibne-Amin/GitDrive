"use client";

import { useState } from "react";
import {
  Download,
  MoreVertical,
  Pencil,
  Trash2,
  ExternalLink,
  Loader2,
} from "lucide-react";
import type { DriveEntry } from "@/types/drive";
import FileTypeIcon from "./FileTypeIcon";
import { formatBytes, formatDate } from "@/lib/utils";
import { GITHUB_RECOMMENDED_FILE_LIMIT_MB } from "@/lib/env.client";

export default function FileGrid({
  entries,
  isLoading,
  onOpenFolder,
  onDelete,
  onRename,
  isDeleting,
}: {
  entries: DriveEntry[];
  isLoading: boolean;
  onOpenFolder: (path: string) => void;
  onDelete: (entry: DriveEntry) => void;
  onRename: (entry: DriveEntry) => void;
  isDeleting: (entry: DriveEntry) => boolean;
}) {
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center text-gray-400">
        <p className="text-sm">This folder is empty.</p>
        <p className="text-xs">Drag files here or use the Upload button.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-left text-xs text-gray-400">
            <th className="px-4 py-2 font-medium">Name</th>
            <th className="hidden px-4 py-2 font-medium sm:table-cell">
              Last modified
            </th>
            <th className="hidden px-4 py-2 font-medium sm:table-cell">Size</th>
            <th className="w-10 px-4 py-2" />
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const oversizedWarning =
              entry.type === "file" &&
              entry.size / (1024 * 1024) > GITHUB_RECOMMENDED_FILE_LIMIT_MB;

            return (
              <tr
                key={entry.path}
                className="group border-b border-gray-50 last:border-0 hover:bg-gray-50"
              >
                <td className="px-4 py-2.5">
                  <button
                    onClick={() =>
                      entry.type === "dir"
                        ? onOpenFolder(entry.path)
                        : window.open(entry.downloadUrl ?? entry.htmlUrl, "_blank")
                    }
                    className="flex items-center gap-2.5 text-left"
                  >
                    <FileTypeIcon
                      type={entry.type}
                      name={entry.name}
                      className="h-5 w-5 shrink-0 text-gray-500"
                    />
                    <span className="truncate font-medium text-gray-800">
                      {entry.name}
                    </span>
                    {oversizedWarning && (
                      <span
                        className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700"
                        title={`Over GitHub's recommended ${GITHUB_RECOMMENDED_FILE_LIMIT_MB}MB per file`}
                      >
                        Large
                      </span>
                    )}
                  </button>
                </td>
                <td className="hidden px-4 py-2.5 text-gray-400 sm:table-cell">
                  {formatDate(entry.lastCommitDate)}
                </td>
                <td className="hidden px-4 py-2.5 text-gray-400 sm:table-cell">
                  {entry.type === "dir" ? "—" : formatBytes(entry.size)}
                </td>
                <td className="relative px-4 py-2.5">
                  {isDeleting(entry) ? (
                    <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                  ) : (
                    <>
                      <button
                        onClick={() =>
                          setMenuOpenFor(menuOpenFor === entry.path ? null : entry.path)
                        }
                        className="rounded-md p-1 text-gray-400 opacity-0 transition hover:bg-gray-200 hover:text-gray-700 group-hover:opacity-100"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>

                      {menuOpenFor === entry.path && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setMenuOpenFor(null)}
                          />
                          <div className="absolute right-4 top-9 z-20 w-40 animate-fade-in rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                            {entry.type === "file" && entry.downloadUrl && (
                              <MenuItem
                                icon={<Download className="h-3.5 w-3.5" />}
                                label="Download"
                                onClick={() => {
                                  window.open(entry.downloadUrl!, "_blank");
                                  setMenuOpenFor(null);
                                }}
                              />
                            )}
                            <MenuItem
                              icon={<ExternalLink className="h-3.5 w-3.5" />}
                              label="View on GitHub"
                              onClick={() => {
                                window.open(entry.htmlUrl, "_blank");
                                setMenuOpenFor(null);
                              }}
                            />
                            {entry.type === "file" && (
                              <MenuItem
                                icon={<Pencil className="h-3.5 w-3.5" />}
                                label="Rename"
                                onClick={() => {
                                  onRename(entry);
                                  setMenuOpenFor(null);
                                }}
                              />
                            )}
                            <MenuItem
                              icon={<Trash2 className="h-3.5 w-3.5" />}
                              label="Delete"
                              destructive
                              onClick={() => {
                                onDelete(entry);
                                setMenuOpenFor(null);
                              }}
                            />
                          </div>
                        </>
                      )}
                    </>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  destructive,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition hover:bg-gray-50 ${
        destructive ? "text-red-600" : "text-gray-700"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
