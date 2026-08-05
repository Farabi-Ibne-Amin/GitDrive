import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getOctokit, GitHubAuthError } from "@/lib/github";
import {
  listDirectory,
  getLastCommitInfo,
  uploadSmallFile,
  deleteFile,
  deleteFolder,
  type RepoContext,
} from "@/lib/github-drive";
import { GitDriveApiError } from "@/types/drive";

// ---------------------------------------------------------------------------
// GET /api/files?owner=...&repo=...&path=...
// Lists directory contents and enriches each entry with last-commit info.
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  try {
    const octokit = await getOctokit();
    const { searchParams } = new URL(req.url);
    const owner = searchParams.get("owner");
    const repo = searchParams.get("repo");
    const path = searchParams.get("path") ?? "";

    if (!owner || !repo) {
      return NextResponse.json(
        { error: "owner and repo query params are required." },
        { status: 400 }
      );
    }

    const ctx: RepoContext = { octokit, owner, repo };
    const entries = await listDirectory(ctx, path);

    // Enrich with last-commit metadata in parallel. Capped concurrency
    // isn't strictly needed here since Octokit's built-in throttling plugin
    // handles secondary rate limits, but we keep folders reasonably sized
    // in the UI (Phase 4 adds pagination for very large folders).
    const enriched = await Promise.all(
      entries.map(async (entry) => {
        const commitInfo = await getLastCommitInfo(ctx, entry.path);
        return {
          ...entry,
          lastCommitDate: commitInfo.date,
          lastCommitMessage: commitInfo.message,
        };
      })
    );

    return NextResponse.json({ path, entries: enriched });
  } catch (err) {
    return handleError(err);
  }
}

// ---------------------------------------------------------------------------
// POST /api/files
// Uploads a small file (<1MB) via the Contents API. For files >=1MB, the
// client should call /api/files/upload instead (Git Blob API route).
// ---------------------------------------------------------------------------
const uploadSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  path: z.string().min(1),
  contentBase64: z.string(),
  message: z.string().optional(),
  existingSha: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const octokit = await getOctokit();
    const body = await req.json();
    const parsed = uploadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { owner, repo, path, contentBase64, message, existingSha } = parsed.data;
    const ctx: RepoContext = { octokit, owner, repo };

    const entry = await uploadSmallFile(
      ctx,
      path,
      contentBase64,
      message ?? `Upload ${path}`,
      existingSha
    );

    return NextResponse.json({ entry }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/files
// Deletes a single file (sha required) or a whole folder (isDirectory=true).
// ---------------------------------------------------------------------------
const deleteSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  path: z.string().min(1),
  sha: z.string().optional(),
  isDirectory: z.boolean().optional(),
  message: z.string().optional(),
});

export async function DELETE(req: NextRequest) {
  try {
    const octokit = await getOctokit();
    const body = await req.json();
    const parsed = deleteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { owner, repo, path, sha, isDirectory, message } = parsed.data;
    const ctx: RepoContext = { octokit, owner, repo };

    if (isDirectory) {
      await deleteFolder(ctx, path);
    } else {
      if (!sha) {
        return NextResponse.json(
          { error: "sha is required to delete a file." },
          { status: 400 }
        );
      }
      await deleteFile(ctx, path, sha, message ?? `Delete ${path}`);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return handleError(err);
  }
}

function handleError(err: unknown) {
  if (err instanceof GitHubAuthError) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
  if (err instanceof GitDriveApiError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  console.error(err);
  return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
}
