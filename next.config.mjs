/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "raw.githubusercontent.com" },
    ],
  },
  // Server Actions / API routes may receive base64-encoded file payloads for
  // uploads. GitHub's own single-file cap is 100MB, but base64 encoding adds
  // ~33% overhead, and Next's default body limit is 1MB — raise it so
  // uploads up to our app-level cap aren't rejected before reaching our own
  // size validation in the API route.
  experimental: {
    serverActions: {
      bodySizeLimit: "150mb",
    },
  },
};

export default nextConfig;
