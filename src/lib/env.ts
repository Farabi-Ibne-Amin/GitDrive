import { z } from "zod";

const envSchema = z.object({
  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(1, "NEXTAUTH_SECRET is required"),
  GITHUB_CLIENT_ID: z.string().min(1, "GITHUB_CLIENT_ID is required"),
  GITHUB_CLIENT_SECRET: z.string().min(1, "GITHUB_CLIENT_SECRET is required"),
  GITDRIVE_DEFAULT_REPO_NAME: z.string().default("my-git-drive"),
  GITDRIVE_MAX_FILE_SIZE_MB: z.coerce.number().default(100),
});

// Parse once, fail fast on boot if misconfigured, instead of surfacing a
// cryptic error deep inside an API route later.
const parsed = envSchema.safeParse({
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
  GITDRIVE_DEFAULT_REPO_NAME: process.env.GITDRIVE_DEFAULT_REPO_NAME,
  GITDRIVE_MAX_FILE_SIZE_MB: process.env.GITDRIVE_MAX_FILE_SIZE_MB,
});

if (!parsed.success) {
  console.error(
    "❌ Invalid environment variables:",
    parsed.error.flatten().fieldErrors
  );
  throw new Error(
    "Invalid environment variables. Check .env.local against .env.example."
  );
}

export const env = parsed.data;

// GitHub's hard per-file cap. We keep our configurable app-level cap
// (GITDRIVE_MAX_FILE_SIZE_MB) at or below this.
export const GITHUB_HARD_FILE_LIMIT_MB = 100;
// GitHub recommends staying under this for good performance in the UI/API.
export const GITHUB_RECOMMENDED_FILE_LIMIT_MB = 50;
// Content API (base64 in a single JSON request) chokes above ~1MB in
// practice — anything bigger should go through the Git Data (blob) API.
export const CONTENT_API_SAFE_LIMIT_MB = 1;
