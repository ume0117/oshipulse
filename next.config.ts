import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: https://cdn.bsky.app https://av-cdn.bsky.app",
              "connect-src 'self' https://api.bsky.app https://bsky.social https://*.supabase.co",
              "worker-src 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
