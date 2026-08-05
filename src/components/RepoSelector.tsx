"use client";

import { useState } from "react";
import { FolderGit2, Lock, Globe, Plus, Loader2 } from "lucide-react";
import { useRepos, useCreateRepo } from "@/hooks/useDrive";
import type { DriveRepo } from "@/types/drive";
import { cn } from "@/lib/utils";

export default function RepoSelector({
  onSelect,
}: {
  onSelect: (repo: DriveRepo) => void;
}) {
  const { data: repos, isLoading, isError, error } = useRepos();
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Choose your storage repository</h1>
      <p className="mt-1 text-sm text-gray-500">
        GitDrive stores your files as commits in a GitHub repository. Pick an
        existing repo to use as a drive, or create a new dedicated one.
      </p>

      <button
        onClick={() => setShowCreate(true)}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 py-4 text-sm font-medium text-gray-600 transition hover:border-drive-600 hover:text-drive-700"
      >
        <Plus className="h-4 w-4" />
        Create a new drive repository
      </button>

      {showCreate && (
        <CreateRepoForm
          onCreated={(repo) => {
            setShowCreate(false);
            onSelect(repo);
          }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      <div className="mt-8">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Or use an existing repository
        </h2>

        {isLoading && (
          <div className="flex items-center gap-2 py-8 text-sm text-gray-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading your repositories…
          </div>
        )}

        {isError && (
          <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">
            {error instanceof Error ? error.message : "Failed to load repositories."}
          </p>
        )}

        <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
          {repos?.map((repo) => (
            <li key={repo.fullName}>
              <button
                onClick={() => onSelect(repo)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-gray-50"
              >
                <FolderGit2 className="h-5 w-5 shrink-0 text-gray-400" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">
                      {repo.name}
                    </span>
                    {repo.private ? (
                      <Lock className="h-3 w-3 shrink-0 text-gray-400" />
                    ) : (
                      <Globe className="h-3 w-3 shrink-0 text-gray-400" />
                    )}
                  </div>
                  {repo.description && (
                    <p className="truncate text-xs text-gray-400">
                      {repo.description}
                    </p>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function CreateRepoForm({
  onCreated,
  onCancel,
}: {
  onCreated: (repo: DriveRepo) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("my-git-drive");
  const [isPrivate, setIsPrivate] = useState(true);
  const createRepo = useCreateRepo();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        createRepo.mutate(
          { name, private: isPrivate },
          { onSuccess: (data) => onCreated(data.repo) }
        );
      }}
      className="mt-4 space-y-4 rounded-lg border border-gray-200 bg-white p-4"
    >
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">
          Repository name
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-drive-600 focus:outline-none focus:ring-1 focus:ring-drive-600"
          pattern="[a-zA-Z0-9._-]+"
          required
        />
      </div>

      <div className="flex gap-3">
        <VisibilityOption
          selected={isPrivate}
          onClick={() => setIsPrivate(true)}
          icon={<Lock className="h-4 w-4" />}
          label="Private"
          description="Only you can see it"
        />
        <VisibilityOption
          selected={!isPrivate}
          onClick={() => setIsPrivate(false)}
          icon={<Globe className="h-4 w-4" />}
          label="Public"
          description="Anyone can see it"
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={createRepo.isPending}
          className="flex items-center gap-1.5 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-50"
        >
          {createRepo.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Create repository
        </button>
      </div>
    </form>
  );
}

function VisibilityOption({
  selected,
  onClick,
  icon,
  label,
  description,
}: {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex-1 rounded-lg border p-3 text-left transition",
        selected
          ? "border-drive-600 bg-drive-50 ring-1 ring-drive-600"
          : "border-gray-200 hover:border-gray-300"
      )}
    >
      <div className="flex items-center gap-1.5 text-sm font-medium">
        {icon}
        {label}
      </div>
      <p className="mt-0.5 text-xs text-gray-500">{description}</p>
    </button>
  );
}
