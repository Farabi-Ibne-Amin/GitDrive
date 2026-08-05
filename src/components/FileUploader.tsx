"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useUploadFiles, type UploadProgressState, type UploadTarget } from "@/hooks/useDrive";
import { formatBytes } from "@/lib/utils";
import { GITHUB_HARD_FILE_LIMIT_MB, GITHUB_RECOMMENDED_FILE_LIMIT_MB } from "@/lib/env.client";

export default function FileUploader({
  target,
  onClose,
}: {
  target: UploadTarget;
  onClose: () => void;
}) {
  const [queue, setQueue] = useState<UploadProgressState[]>([]);
  const upload = useUploadFiles(target, (state) => {
    setQueue((prev) => {
      const idx = prev.findIndex((p) => p.fileName === state.fileName);
      if (idx === -1) return [...prev, state];
      const copy = [...prev];
      copy[idx] = state;
      return copy;
    });
  });

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      setQueue(
        acceptedFiles.map((f) => ({ fileName: f.name, status: "pending" as const }))
      );
      upload.mutate(acceptedFiles);
    },
    [upload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: GITHUB_HARD_FILE_LIMIT_MB * 1024 * 1024,
  });

  const isBusy = upload.isPending;
  const allDone = queue.length > 0 && queue.every((q) => q.status === "done" || q.status === "error");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">Upload files</h2>
          <button
            onClick={onClose}
            disabled={isBusy}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {queue.length === 0 && (
          <div
            {...getRootProps()}
            className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-10 text-center transition ${
              isDragActive
                ? "border-drive-600 bg-drive-50"
                : "border-gray-300 hover:border-gray-400"
            }`}
          >
            <input {...getInputProps()} />
            <UploadCloud className="h-8 w-8 text-gray-400" />
            <p className="text-sm text-gray-600">
              {isDragActive ? "Drop files here" : "Drag & drop files, or click to browse"}
            </p>
            <p className="text-xs text-gray-400">
              Up to {GITHUB_HARD_FILE_LIMIT_MB}MB per file (GitHub&apos;s hard limit).
              Files over {GITHUB_RECOMMENDED_FILE_LIMIT_MB}MB may be slower to work with.
            </p>
          </div>
        )}

        {queue.length > 0 && (
          <div className="max-h-80 space-y-2 overflow-y-auto scrollbar-thin">
            {queue.map((item) => (
              <div
                key={item.fileName}
                className="flex items-center gap-3 rounded-md border border-gray-100 px-3 py-2"
              >
                <StatusIcon status={item.status} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-gray-700">{item.fileName}</p>
                  {item.status === "error" && item.errorMessage && (
                    <p className="truncate text-xs text-red-500">{item.errorMessage}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {allDone && (
          <div className="mt-4 flex justify-end">
            <button
              onClick={onClose}
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: UploadProgressState["status"] }) {
  if (status === "uploading" || status === "pending") {
    return <Loader2 className="h-4 w-4 shrink-0 animate-spin text-drive-600" />;
  }
  if (status === "done") {
    return <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />;
  }
  return <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />;
}

// Re-export for convenience so callers only need one import path.
export { formatBytes };
