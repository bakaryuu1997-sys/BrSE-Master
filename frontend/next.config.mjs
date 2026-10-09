import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import withBundleAnalyzer from "@next/bundle-analyzer";

const rootDir = dirname(fileURLToPath(import.meta.url));
const internalApiBaseUrl = process.env.INTERNAL_API_BASE_URL ?? "http://localhost:8000";

const extraAllowedOrigins = process.env.ALLOWED_DEV_ORIGINS
  ? process.env.ALLOWED_DEV_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean)
  : [];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: [
    "127.0.0.1",
    "localhost",
    "127.0.0.1:3010",
    "localhost:3010",
    ...extraAllowedOrigins,
  ],
  turbopack: {
    root: rootDir,
  },
  experimental: {
    proxyClientMaxBodySize: "2048mb",
    // Default rewrite proxy timeout is 30s, which cut off long AI calls (chat,
    // sequential model smoke) before the backend finished. Raise it so slow
    // local models and multi-model smokes complete through the /api proxy.
    proxyTimeout: 150_000,
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${internalApiBaseUrl.replace(/\/$/, "")}/api/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/app",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate, proxy-revalidate" },
          { key: "Pragma", value: "no-cache" },
          { key: "Expires", value: "0" },
        ],
      },
      {
        source: "/app/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate, proxy-revalidate" },
          { key: "Pragma", value: "no-cache" },
          { key: "Expires", value: "0" },
        ],
      },
      {
        source: "/test-access",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate, proxy-revalidate" },
          { key: "Pragma", value: "no-cache" },
          { key: "Expires", value: "0" },
        ],
      },
      {
        source: "/test-access/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate, proxy-revalidate" },
          { key: "Pragma", value: "no-cache" },
          { key: "Expires", value: "0" },
        ],
      },
    ];
  },
};

const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

export default bundleAnalyzer(nextConfig);
