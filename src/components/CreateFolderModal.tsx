"use client";

import { useState } from "react";
import { X, Loader2, FolderPlus } from "lucide-react";

export default function CreateFolderModal({
  onCreate,
  onClose,
  isCreating,
}: {
  onCreate: (name: string) => void;
  onClose: () => void;
  isCreating: boolean;
}) {
  const [name, setName] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) onCreate(name.trim());
        }}
        className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <FolderPlus className="h-4 w-4" />
            New folder
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Untitled folder"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-drive-600 focus:outline-none focus:ring-1 focus:ring-drive-600"
        />

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!name.trim() || isCreating}
            className="flex items-center gap-1.5 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {isCreating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Create
          </button>
        </div>
      </form>
    </div>
  );
}
