import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow connections to local socket server during development
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
        ],
      },
    ];
  },
};

export default nextConfig;
