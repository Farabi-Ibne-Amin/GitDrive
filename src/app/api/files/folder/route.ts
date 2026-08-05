import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getOctokit, GitHubAuthError } from "@/lib/github";
import { createFolder, type RepoContext } from "@/lib/github-drive";
import { GitDriveApiError } from "@/types/drive";

const createFolderSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  path: z
    .string()
    .min(1)
    .regex(/^[^<>:"|?*]+$/, "Folder name contains invalid characters."),
});

export async function POST(req: NextRequest) {
  try {
    const octokit = await getOctokit();
    const body = await req.json();
    const parsed = createFolderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { owner, repo, path } = parsed.data;
    const ctx: RepoContext = { octokit, owner, repo };
    await createFolder(ctx, path);

    return NextResponse.json({ success: true, path }, { status: 201 });
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
