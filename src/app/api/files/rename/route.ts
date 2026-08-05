import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getOctokit, GitHubAuthError } from "@/lib/github";
import { renameFile, type RepoContext } from "@/lib/github-drive";
import { GitDriveApiError } from "@/types/drive";

const renameSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  fromPath: z.string().min(1),
  toPath: z.string().min(1),
  message: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const octokit = await getOctokit();
    const body = await req.json();
    const parsed = renameSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { owner, repo, fromPath, toPath, message } = parsed.data;
    const ctx: RepoContext = { octokit, owner, repo };

    await renameFile(
      ctx,
      fromPath,
      toPath,
      message ?? `Rename ${fromPath} -> ${toPath}`
    );

    return NextResponse.json({ success: true });
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
