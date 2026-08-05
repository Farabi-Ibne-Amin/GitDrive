import { Octokit } from "@octokit/rest";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

export class GitHubAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GitHubAuthError";
  }
}

/**
 * Creates an Octokit instance authenticated as the current user.
 * Call this from Route Handlers / Server Components only — it relies on
 * getServerSession, which needs request context (cookies).
 */
export async function getOctokit(): Promise<Octokit> {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    throw new GitHubAuthError("No authenticated GitHub session found.");
  }

  return new Octokit({
    auth: session.accessToken,
    retry: { enabled: true },
  });
}

/** Variant for cases where a token is already in hand (e.g. tests). */
export function getOctokitWithToken(accessToken: string): Octokit {
  return new Octokit({ auth: accessToken, retry: { enabled: true } });
}

/** Authenticated user info — used to scope repo operations to `owner`. */
export async function getAuthenticatedGitHubUser() {
  const octokit = await getOctokit();
  const { data } = await octokit.rest.users.getAuthenticated();
  return data;
}

/**
 * Reads GitHub's rate-limit headers off a raw Octokit response and returns
 * a normalized shape the UI can use to show warnings (Phase 4).
 */
export function parseRateLimitHeaders(headers: Record<string, unknown>) {
  const limit = Number(headers["x-ratelimit-limit"] ?? NaN);
  const remaining = Number(headers["x-ratelimit-remaining"] ?? NaN);
  const resetEpoch = Number(headers["x-ratelimit-reset"] ?? NaN);

  return {
    limit: Number.isNaN(limit) ? null : limit,
    remaining: Number.isNaN(remaining) ? null : remaining,
    resetAt: Number.isNaN(resetEpoch) ? null : new Date(resetEpoch * 1000),
  };
}
