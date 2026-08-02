import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // TypeScript 7 (compilador nuevo) todavía no expone la API que usa Next.
  experimental: { useTypeScriptCli: true },
};

export default nextConfig;
