import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["*.ngrok-free.app", "*.ngrok.io", "*.ngrok.app"],
  // Hide the Next.js "N" badge on mobile / tunnel previews
  devIndicators: false,
  agentRules: false,
};

export default nextConfig;
