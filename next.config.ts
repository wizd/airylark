import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone',
  env: {
    MCP_SERVER_URL: process.env.MCP_SERVER_URL || 'http://localhost:3041',
  },
};

export default nextConfig;
