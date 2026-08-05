"use client";

import { AlertTriangle, Loader2, X } from "lucide-react";
import type { DriveEntry } from "@/types/drive";

export default function DeleteConfirmModal({
  entry,
  onConfirm,
  onCancel,
  isDeleting,
}: {
  entry: DriveEntry;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-base font-semibold text-red-600">
            <AlertTriangle className="h-4 w-4" />
            Delete {entry.type === "dir" ? "folder" : "file"}
          </div>
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-sm text-gray-600">
          Are you sure you want to delete{" "}
          <span className="font-medium text-gray-900">&quot;{entry.name}&quot;</span>?
          {entry.type === "dir" && (
            <span className="mt-1 block text-xs text-amber-600">
              This will delete every file inside the folder — one commit per
              file. This may take a while for large folders and cannot be
              undone from the app (though git history is preserved).
            </span>
          )}
        </p>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex items-center gap-1.5 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {isDeleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
