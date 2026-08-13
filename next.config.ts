import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // El indicador de desarrollo de Next se para justo encima del botón de la
  // nube, abajo a la izquierda. En producción no existe, pero en local tapa.
  devIndicators: { position: "bottom-right" },
  // TypeScript 7 (compilador nuevo) todavía no expone la API que usa Next.
  experimental: { useTypeScriptCli: true },
};

export default nextConfig;
