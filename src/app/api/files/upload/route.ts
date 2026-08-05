import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getOctokit, GitHubAuthError } from "@/lib/github";
import { uploadLargeFile, type RepoContext } from "@/lib/github-drive";
import { GitDriveApiError } from "@/types/drive";
import { env } from "@/lib/env";

// ---------------------------------------------------------------------------
// POST /api/files/upload
// Handles files >= 1MB via the Git Data (blob) API — see uploadLargeFile in
// github-drive.ts for the full 5-step git object graph explanation.
// ---------------------------------------------------------------------------
const uploadSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  path: z.string().min(1),
  contentBase64: z.string(),
  message: z.string().optional(),
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

    const { owner, repo, path, contentBase64, message } = parsed.data;

    const sizeMb = (contentBase64.length * 0.75) / (1024 * 1024);
    if (sizeMb > env.GITDRIVE_MAX_FILE_SIZE_MB) {
      return NextResponse.json(
        {
          error: `File is ${sizeMb.toFixed(
            1
          )}MB, which exceeds this app's configured limit of ${env.GITDRIVE_MAX_FILE_SIZE_MB}MB.`,
        },
        { status: 413 }
      );
    }

    const ctx: RepoContext = { octokit, owner, repo };
    const entry = await uploadLargeFile(
      ctx,
      path,
      contentBase64,
      message ?? `Upload ${path}`
    );

    return NextResponse.json({ entry }, { status: 201 });
  } catch (err) {
    if (err instanceof GitHubAuthError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    if (err instanceof GitDriveApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(err);
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}

// Route segment config: raise the body size limit for this specific route
// since large-file uploads can approach ~130MB once base64-encoded (100MB
// file * 4/3 encoding overhead).
export const maxDuration = 60; // seconds — large uploads take a few API round-trips
