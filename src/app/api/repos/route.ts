import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getOctokit, GitHubAuthError } from "@/lib/github";
import { listCandidateRepos, createDriveRepo } from "@/lib/github-drive";
import { GitDriveApiError } from "@/types/drive";

const createRepoSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(100)
    .regex(
      /^[a-zA-Z0-9._-]+$/,
      "Repo name can only contain letters, numbers, dots, dashes, and underscores."
    ),
  private: z.boolean().default(true),
  description: z.string().max(350).optional(),
});

export async function GET() {
  try {
    const octokit = await getOctokit();
    const repos = await listCandidateRepos(octokit);
    return NextResponse.json({ repos });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const octokit = await getOctokit();
    const body = await req.json();
    const parsed = createRepoSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const repo = await createDriveRepo(
      octokit,
      parsed.data.name,
      parsed.data.private,
      parsed.data.description
    );
    return NextResponse.json({ repo }, { status: 201 });
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
