"use client";

import { ChevronRight, HardDrive } from "lucide-react";
import { buildBreadcrumbs } from "@/lib/utils";

export default function Breadcrumbs({
  repoName,
  path,
  onNavigate,
}: {
  repoName: string;
  path: string;
  onNavigate: (path: string) => void;
}) {
  const segments = buildBreadcrumbs(path);

  return (
    <nav className="flex items-center gap-1 overflow-x-auto text-sm">
      <button
        onClick={() => onNavigate("")}
        className="flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 font-medium text-gray-700 transition hover:bg-gray-100"
      >
        <HardDrive className="h-4 w-4" />
        {repoName}
      </button>

      {segments.map((seg) => (
        <span key={seg.path} className="flex shrink-0 items-center gap-1">
          <ChevronRight className="h-3.5 w-3.5 text-gray-300" />
          <button
            onClick={() => onNavigate(seg.path)}
            className={
              seg.path === path
                ? "rounded-md px-2 py-1 font-medium text-gray-900"
                : "rounded-md px-2 py-1 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
            }
          >
            {seg.name}
          </button>
        </span>
      ))}
    </nav>
  );
}
