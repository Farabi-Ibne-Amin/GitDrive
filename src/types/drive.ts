// Shared domain types for GitDrive. Kept separate from raw GitHub API
// response shapes so the UI never has to know about GitHub's field names.

export type DriveEntryType = "file" | "dir";

export interface DriveEntry {
  name: string;
  path: string; // path relative to repo root, e.g. "Photos/vacation.jpg"
  type: DriveEntryType;
  size: number; // bytes; 0 for directories
  sha: string; // git blob/tree sha — needed for update/delete operations
  downloadUrl: string | null; // raw.githubusercontent.com URL, null for dirs
  htmlUrl: string; // link to view on github.com
  lastCommitDate: string | null; // ISO date string, fetched separately
  lastCommitMessage: string | null;
}

export interface DriveRepo {
  owner: string;
  name: string;
  fullName: string; // "owner/name"
  private: boolean;
  defaultBranch: string;
  htmlUrl: string;
  description: string | null;
  updatedAt: string;
}

export interface BreadcrumbSegment {
  name: string;
  path: string;
}

// Payload the client sends when creating/updating a small file (<1MB) via
// the Content API.
export interface UploadFilePayload {
  repo: string;
  path: string; // full path including filename
  contentBase64: string;
  message?: string;
}

// Payload for large files (>1MB), routed through the Git Data (blob) API.
export interface UploadBlobPayload {
  repo: string;
  path: string;
  contentBase64: string;
  message?: string;
}

export interface DeleteFilePayload {
  repo: string;
  path: string;
  sha: string;
  message?: string;
  isDirectory?: boolean;
}

export interface CreateFolderPayload {
  repo: string;
  path: string; // folder path, e.g. "Photos/2026"
}

export interface RenamePayload {
  repo: string;
  fromPath: string;
  toPath: string;
  message?: string;
}

export interface CreateRepoPayload {
  name: string;
  private: boolean;
  description?: string;
}

export class GitDriveApiError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.name = "GitDriveApiError";
    this.status = status;
  }
}
