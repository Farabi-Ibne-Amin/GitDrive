"use client";

import { useState } from "react";
import { Upload, FolderPlus, ChevronLeft, RefreshCw, AlertCircle } from "lucide-react";
import type { DriveEntry, DriveRepo } from "@/types/drive";
import Breadcrumbs from "./Breadcrumbs";
import FileGrid from "./FileGrid";
import FileUploader from "./FileUploader";
import CreateFolderModal from "./CreateFolderModal";
import DeleteConfirmModal from "./DeleteConfirmModal";
import RenameModal from "./RenameModal";
import {
  useDirectory,
  useCreateFolder,
  useDeleteEntry,
  useRenameEntry,
} from "@/hooks/useDrive";
import { joinPath } from "@/lib/utils";

export default function FileExplorer({
  repo,
  onChangeRepo,
}: {
  repo: DriveRepo;
  onChangeRepo: () => void;
}) {
  const [currentPath, setCurrentPath] = useState("");
  const [showUploader, setShowUploader] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [entryPendingDelete, setEntryPendingDelete] = useState<DriveEntry | null>(null);
  const [entryPendingRename, setEntryPendingRename] = useState<DriveEntry | null>(null);
  const [deletingPath, setDeletingPath] = useState<string | null>(null);

  const {
    data: entries,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useDirectory(repo.owner, repo.name, currentPath);

  const createFolder = useCreateFolder(repo.owner, repo.name, currentPath);
  const deleteEntry = useDeleteEntry(repo.owner, repo.name, currentPath);
  const renameEntry = useRenameEntry(repo.owner, repo.name, currentPath);

  const isRateLimited =
    isError && error instanceof Error && /rate limit/i.test(error.message);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={onChangeRepo}
            className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-gray-500 hover:bg-gray-100"
            title="Switch repository"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Repos
          </button>
          <Breadcrumbs
            repoName={repo.name}
            path={currentPath}
            onNavigate={setCurrentPath}
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setShowCreateFolder(true)}
            className="flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <FolderPlus className="h-4 w-4" />
            <span className="hidden sm:inline">New folder</span>
          </button>
          <button
            onClick={() => setShowUploader(true)}
            className="flex items-center gap-1.5 rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            <Upload className="h-4 w-4" />
            Upload
          </button>
        </div>
      </div>

      {/* Error / rate-limit banner */}
      {isError && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">
              {isRateLimited ? "GitHub API rate limit reached" : "Failed to load files"}
            </p>
            <p className="text-xs text-red-600">
              {isRateLimited
                ? "GitHub limits how many requests an app can make per hour. Wait a few minutes and try again."
                : error instanceof Error
                ? error.message
                : "An unknown error occurred."}
            </p>
          </div>
        </div>
      )}

      <FileGrid
        entries={entries ?? []}
        isLoading={isLoading}
        onOpenFolder={setCurrentPath}
        onDelete={setEntryPendingDelete}
        onRename={setEntryPendingRename}
        isDeleting={(entry) => deletingPath === entry.path}
      />

      {/* Modals */}
      {showUploader && (
        <FileUploader
          target={{ owner: repo.owner, repo: repo.name, folderPath: currentPath }}
          onClose={() => setShowUploader(false)}
        />
      )}

      {showCreateFolder && (
        <CreateFolderModal
          isCreating={createFolder.isPending}
          onCreate={(name) =>
            createFolder.mutate(name, {
              onSuccess: () => setShowCreateFolder(false),
            })
          }
          onClose={() => setShowCreateFolder(false)}
        />
      )}

      {entryPendingDelete && (
        <DeleteConfirmModal
          entry={entryPendingDelete}
          isDeleting={deleteEntry.isPending}
          onConfirm={() => {
            setDeletingPath(entryPendingDelete.path);
            deleteEntry.mutate(entryPendingDelete, {
              onSettled: () => {
                setDeletingPath(null);
                setEntryPendingDelete(null);
              },
            });
          }}
          onCancel={() => setEntryPendingDelete(null)}
        />
      )}

      {entryPendingRename && (
        <RenameModal
          entry={entryPendingRename}
          isRenaming={renameEntry.isPending}
          onRename={(newName) => {
            const folder = currentPath;
            renameEntry.mutate(
              {
                fromPath: entryPendingRename.path,
                toPath: joinPath(folder, newName),
              },
              { onSuccess: () => setEntryPendingRename(null) }
            );
          }}
          onClose={() => setEntryPendingRename(null)}
        />
      )}
    </div>
  );
}
