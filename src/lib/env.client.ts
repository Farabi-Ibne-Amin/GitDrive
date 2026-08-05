// Constants safe to import from client components. Unlike src/lib/env.ts
// (which validates server-only secrets like GITHUB_CLIENT_SECRET), nothing
// here is sensitive — it's just shared limits used for client-side
// validation before a request even reaches the server.

export const GITHUB_HARD_FILE_LIMIT_MB = 100;
export const GITHUB_RECOMMENDED_FILE_LIMIT_MB = 50;
