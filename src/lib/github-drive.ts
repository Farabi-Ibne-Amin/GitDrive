import type { Octokit } from "@octokit/rest";
import { RequestError } from "@octokit/request-error";
import {
  CONTENT_API_SAFE_LIMIT_MB,
  GITHUB_HARD_FILE_LIMIT_MB,
} from "./env";
import { GitDriveApiError, type DriveEntry, type DriveRepo } from "@/types/drive";

/**
 * ============================================================================
 * GitDrive <-> GitHub API mapping
 * ============================================================================
 * Drive operation        -> GitHub API
 * ----------------------------------------------------------------------------
 * List folder            -> GET /repos/{owner}/{repo}/contents/{path}
 * Read file metadata      -> GET /repos/{owner}/{repo}/contents/{path}
 * Upload small file (<1MB)-> PUT /repos/{owner}/{repo}/contents/{path}
 *                            (Content API - base64 body, single request)
 * Upload large file        -> Git Data API, 3 calls:
 *   (up to 100MB)            1. POST /repos/{o}/{r}/git/blobs        (blob)
 *                            2. POST /repos/{o}/{r}/git/trees        (tree)
 *                            3. POST /repos/{o}/{r}/git/commits      (commit)
 *                            4. PATCH /repos/{o}/{r}/git/refs/{ref}  (move branch head)
 * Delete file             -> DELETE /repos/{owner}/{repo}/contents/{path}
 * Delete folder           -> recursive delete of every blob inside, one
 *                            DELETE per file (Contents API has no folder
 *                            delete — a "folder" is just a shared prefix)
 * Create folder            -> PUT .../contents/{path}/.gitkeep (empty file;
 *                            git has no concept of empty directories)
 * Rename / move            -> GET old content -> PUT new path -> DELETE old
 *                            path (Contents API has no atomic rename; for
 *                            folders this touches every file inside)
 * ============================================================================
 */

export interface RepoContext {
  octokit: Octokit;
  owner: string;
  repo: string;
  branch?: string; // defaults to repo's default branch if omitted
}

function wrapGitHubError(err: unknown, fallbackMessage: string): never {
  if (err instanceof RequestError) {
    if (err.status === 404) {
      throw new GitDriveApiError("Not found in repository.", 404);
    }
    if (err.status === 401 || err.status === 403) {
      // 403 is also what GitHub returns for rate-limit exhaustion — the
      // caller can inspect headers separately if it needs to distinguish.
      throw new GitDriveApiError(
        "GitHub denied this request (auth or rate limit).",
        err.status
      );
      }
    if (err.status === 409) {
      throw new GitDriveApiError(
        "Conflict: the file changed since it was last loaded. Refresh and try again.",
        409
      );
    }
    if (err.status === 422) {
      throw new GitDriveApiError(
        "GitHub rejected the request — check the file/folder name for invalid characters.",
        422
      );
    }
    throw new GitDriveApiError(err.message || fallbackMessage, err.status);
  }
  throw new GitDriveApiError(fallbackMessage);
}

// ---------------------------------------------------------------------------
// Repository discovery / creation
// ---------------------------------------------------------------------------

/** Lists repos owned by the user that look like GitDrive roots, plus all repos as fallback options. */
export async function listCandidateRepos(octokit: Octokit): Promise<DriveRepo[]> {
  try {
    const { data } = await octokit.rest.repos.listForAuthenticatedUser({
      per_page: 100,
      sort: "updated",
      affiliation: "owner",
    });

    return data.map((r) => ({
      owner: r.owner.login,
      name: r.name,
      fullName: r.full_name,
      private: r.private,
      defaultBranch: r.default_branch ?? "main",
      htmlUrl: r.html_url,
      description: r.description,
      updatedAt: r.updated_at ?? new Date().toISOString(),
    }));
  } catch (err) {
    wrapGitHubError(err, "Failed to list repositories.");
  }
}

/** Creates a new repository to act as a GitDrive storage root. */
export async function createDriveRepo(
  octokit: Octokit,
  name: string,
  isPrivate: boolean,
  description?: string
): Promise<DriveRepo> {
  try {
    const { data } = await octokit.rest.repos.createForAuthenticatedUser({
      name,
      private: isPrivate,
      description: description ?? "Cloud storage powered by GitDrive",
      auto_init: true, // creates an initial commit so the tree isn't empty
    });

    return {
      owner: data.owner.login,
      name: data.name,
      fullName: data.full_name,
      private: data.private,
      defaultBranch: data.default_branch ?? "main",
      htmlUrl: data.html_url,
      description: data.description,
      updatedAt: data.updated_at ?? new Date().toISOString(),
    };
  } catch (err) {
    wrapGitHubError(err, "Failed to create repository.");
  }
}

// ---------------------------------------------------------------------------
// Listing contents
// ---------------------------------------------------------------------------

/**
 * Lists the contents of a folder (or repo root if path is "").
 * Filters out the .gitkeep placeholder files used to represent empty
 * folders — those are an implementation detail, not something the user
 * should see or download.
 */
export async function listDirectory(
  ctx: RepoContext,
  path: string
): Promise<DriveEntry[]> {
  try {
    const { data } = await ctx.octokit.rest.repos.getContent({
      owner: ctx.owner,
      repo: ctx.repo,
      path,
      ref: ctx.branch,
    });

    // GitHub returns a single object (not array) if `path` points at a file.
    if (!Array.isArray(data)) {
      throw new GitDriveApiError("Path is a file, not a folder.", 400);
    }

    return data
      .filter((item) => item.name !== ".gitkeep")
      .map((item) => ({
        name: item.name,
        path: item.path,
        type: (item.type === "dir" ? "dir" : "file") as "dir" | "file",
        size: item.size ?? 0,
        sha: item.sha,
        downloadUrl: item.download_url,
        htmlUrl: item.html_url ?? "",
        lastCommitDate: null, // enriched separately (see getLastCommitInfo)
        lastCommitMessage: null,
      }))
      .sort((a, b) => {
        // Folders first, then alphabetical — standard file-explorer ordering.
        if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
  } catch (err) {
    if (err instanceof GitDriveApiError) throw err;
    wrapGitHubError(err, "Failed to list directory contents.");
  }
}

/**
 * Fetches the most recent commit touching a given path, to populate the
 * "last modified" column. Called lazily/in parallel per-entry from the API
 * route since getContent doesn't include commit metadata.
 */
export async function getLastCommitInfo(
  ctx: RepoContext,
  path: string
): Promise<{ date: string | null; message: string | null }> {
  try {
    const { data } = await ctx.octokit.rest.repos.listCommits({
      owner: ctx.owner,
      repo: ctx.repo,
      path,
      sha: ctx.branch,
      per_page: 1,
    });

    const commit = data[0];
    if (!commit) return { date: null, message: null };

    return {
      date: commit.commit.author?.date ?? commit.commit.committer?.date ?? null,
      message: commit.commit.message.split("\n")[0], // first line only
    };
  } catch {
    // Non-fatal — commit history is a nice-to-have, not required for the
    // file to render.
    return { date: null, message: null };
  }
}

// ---------------------------------------------------------------------------
// Upload — small files via Content API
// ---------------------------------------------------------------------------

/**
 * Uploads (creates or updates) a file under 1MB using GitHub's Contents
 * API. This is a single atomic request: GitHub creates the blob, tree, and
 * commit for us. If a file already exists at this path we must pass its
 * current `sha` (fetched by the caller) or GitHub will reject the write.
 */
export async function uploadSmallFile(
  ctx: RepoContext,
  path: string,
  contentBase64: string,
  message: string,
  existingSha?: string
): Promise<DriveEntry> {
  const sizeMb = (contentBase64.length * 0.75) / (1024 * 1024);
  if (sizeMb > CONTENT_API_SAFE_LIMIT_MB) {
    throw new GitDriveApiError(
      `File is ${sizeMb.toFixed(2)}MB — use uploadLargeFile (Git Blob API) for files over 1MB.`,
      400
    );
  }

  try {
    const { data } = await ctx.octokit.rest.repos.createOrUpdateFileContents({
      owner: ctx.owner,
      repo: ctx.repo,
      path,
      message,
      content: contentBase64,
      sha: existingSha,
      branch: ctx.branch,
    });

    const content = data.content!;
    return {
      name: content.name!,
      path: content.path!,
      type: "file",
      size: content.size ?? 0,
      sha: content.sha!,
      downloadUrl: content.download_url ?? null,
      htmlUrl: content.html_url ?? "",
      lastCommitDate: new Date().toISOString(),
      lastCommitMessage: message,
    };
  } catch (err) {
    wrapGitHubError(err, "Failed to upload file.");
  }
}

// ---------------------------------------------------------------------------
// Upload — large files via Git Data (blob) API
// ---------------------------------------------------------------------------

/**
 * Uploads a file between 1MB and 100MB using the low-level Git Data API.
 * The Contents API rejects or struggles with files this size, so instead
 * we manually build the git object graph:
 *   1. Create a blob from the base64 content
 *   2. Get the current branch's tree
 *   3. Create a new tree that adds/replaces our blob at `path`
 *   4. Create a commit pointing at the new tree, parented on the old commit
 *   5. Move the branch ref to point at the new commit
 * This is exactly what `git add && git commit` does locally, done via API.
 */
export async function uploadLargeFile(
  ctx: RepoContext,
  path: string,
  contentBase64: string,
  message: string
): Promise<DriveEntry> {
  const sizeMb = (contentBase64.length * 0.75) / (1024 * 1024);
  if (sizeMb > GITHUB_HARD_FILE_LIMIT_MB) {
    throw new GitDriveApiError(
      `File is ${sizeMb.toFixed(1)}MB, which exceeds GitHub's ${GITHUB_HARD_FILE_LIMIT_MB}MB hard limit per file.`,
      400
    );
  }

  try {
    const branch = ctx.branch ?? (await getDefaultBranch(ctx));

    // 1. Get the ref so we know the current commit + tree to branch from.
    const { data: refData } = await ctx.octokit.rest.git.getRef({
      owner: ctx.owner,
      repo: ctx.repo,
      ref: `heads/${branch}`,
    });
    const parentCommitSha = refData.object.sha;

    const { data: parentCommit } = await ctx.octokit.rest.git.getCommit({
      owner: ctx.owner,
      repo: ctx.repo,
      commit_sha: parentCommitSha,
    });
    const baseTreeSha = parentCommit.tree.sha;

    // 2. Create the blob (the raw file content, base64-encoded).
    const { data: blob } = await ctx.octokit.rest.git.createBlob({
      owner: ctx.owner,
      repo: ctx.repo,
      content: contentBase64,
      encoding: "base64",
    });

    // 3. Create a new tree that layers our single-file change on top of
    // the existing tree (GitHub handles the merge when base_tree is set —
    // we don't need to enumerate every other existing file).
    const { data: newTree } = await ctx.octokit.rest.git.createTree({
      owner: ctx.owner,
      repo: ctx.repo,
      base_tree: baseTreeSha,
      tree: [
        {
          path,
          mode: "100644", // regular file, non-executable
          type: "blob",
          sha: blob.sha,
        },
      ],
    });

    // 4. Create the commit object pointing at the new tree.
    const { data: newCommit } = await ctx.octokit.rest.git.createCommit({
      owner: ctx.owner,
      repo: ctx.repo,
      message,
      tree: newTree.sha,
      parents: [parentCommitSha],
    });

    // 5. Fast-forward the branch to the new commit.
    await ctx.octokit.rest.git.updateRef({
      owner: ctx.owner,
      repo: ctx.repo,
      ref: `heads/${branch}`,
      sha: newCommit.sha,
    });

    return {
      name: path.split("/").pop()!,
      path,
      type: "file",
      size: Math.round(sizeMb * 1024 * 1024),
      sha: blob.sha,
      downloadUrl: `https://raw.githubusercontent.com/${ctx.owner}/${ctx.repo}/${branch}/${path}`,
      htmlUrl: `https://github.com/${ctx.owner}/${ctx.repo}/blob/${branch}/${path}`,
      lastCommitDate: new Date().toISOString(),
      lastCommitMessage: message,
    };
  } catch (err) {
    if (err instanceof GitDriveApiError) throw err;
    wrapGitHubError(err, "Failed to upload large file.");
  }
}

async function getDefaultBranch(ctx: RepoContext): Promise<string> {
  const { data } = await ctx.octokit.rest.repos.get({
    owner: ctx.owner,
    repo: ctx.repo,
  });
  return data.default_branch;
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

/** Deletes a single file. Requires the file's current blob `sha`. */
export async function deleteFile(
  ctx: RepoContext,
  path: string,
  sha: string,
  message: string
): Promise<void> {
  try {
    await ctx.octokit.rest.repos.deleteFile({
      owner: ctx.owner,
      repo: ctx.repo,
      path,
      sha,
      message,
      branch: ctx.branch,
    });
  } catch (err) {
    wrapGitHubError(err, "Failed to delete file.");
  }
}

/**
 * Deletes an entire folder. The Contents API has no notion of directories
 * as first-class objects — a "folder" only exists because files share a
 * path prefix — so we recursively enumerate every file inside and issue
 * one delete commit per file. For large folders this is slow (N API
 * calls); Phase 4 surfaces a progress indicator for this reason.
 */
export async function deleteFolder(
  ctx: RepoContext,
  path: string,
  onProgress?: (deletedCount: number, totalCount: number) => void
): Promise<void> {
  const allFiles = await listAllFilesRecursive(ctx, path);
  let deleted = 0;

  for (const file of allFiles) {
    await deleteFile(ctx, file.path, file.sha, `Delete ${file.path}`);
    deleted++;
    onProgress?.(deleted, allFiles.length);
  }
}

async function listAllFilesRecursive(
  ctx: RepoContext,
  path: string
): Promise<{ path: string; sha: string }[]> {
  const { data } = await ctx.octokit.rest.repos.getContent({
    owner: ctx.owner,
    repo: ctx.repo,
    path,
    ref: ctx.branch,
  });

  if (!Array.isArray(data)) {
    return [{ path, sha: (data as { sha: string }).sha }];
  }

  const results: { path: string; sha: string }[] = [];
  for (const item of data) {
    if (item.type === "dir") {
      results.push(...(await listAllFilesRecursive(ctx, item.path)));
    } else {
      results.push({ path: item.path, sha: item.sha });
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// Create folder
// ---------------------------------------------------------------------------

/**
 * Git has no concept of an empty directory — a tree entry only exists if
 * it contains at least one blob. To "create a folder", we commit a hidden
 * placeholder file (.gitkeep, a long-standing git convention) inside it.
 */
export async function createFolder(
  ctx: RepoContext,
  path: string
): Promise<void> {
  const gitkeepPath = `${path.replace(/\/+$/, "")}/.gitkeep`;
  try {
    await ctx.octokit.rest.repos.createOrUpdateFileContents({
      owner: ctx.owner,
      repo: ctx.repo,
      path: gitkeepPath,
      message: `Create folder ${path}`,
      content: "", // empty file content, base64 of "" is ""
      branch: ctx.branch,
    });
  } catch (err) {
    wrapGitHubError(err, "Failed to create folder.");
  }
}

// ---------------------------------------------------------------------------
// Rename / Move
// ---------------------------------------------------------------------------

/**
 * Renames or moves a single file. The Contents API has no atomic rename,
 * so this reads the file's current content, writes it to the new path,
 * then deletes the old path. Two commits are produced (not one) — this is
 * a known trade-off of building on the high-level Contents API rather than
 * a full Git Data tree rewrite.
 */
export async function renameFile(
  ctx: RepoContext,
  fromPath: string,
  toPath: string,
  message: string
): Promise<void> {
  try {
    const { data } = await ctx.octokit.rest.repos.getContent({
      owner: ctx.owner,
      repo: ctx.repo,
      path: fromPath,
      ref: ctx.branch,
    });

    if (Array.isArray(data) || data.type !== "file") {
      throw new GitDriveApiError(
        "Renaming folders directly isn't supported yet — recreate the contents at the new path.",
        400
      );
    }

    // data.content is base64 already (Contents API default encoding).
    await ctx.octokit.rest.repos.createOrUpdateFileContents({
      owner: ctx.owner,
      repo: ctx.repo,
      path: toPath,
      message,
      content: data.content,
      branch: ctx.branch,
    });

    await ctx.octokit.rest.repos.deleteFile({
      owner: ctx.owner,
      repo: ctx.repo,
      path: fromPath,
      sha: data.sha,
      message: `Remove ${fromPath} (moved to ${toPath})`,
      branch: ctx.branch,
    });
  } catch (err) {
    if (err instanceof GitDriveApiError) throw err;
    wrapGitHubError(err, "Failed to rename/move file.");
  }
}
