import path from "node:path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Evita que o Next confunda a raiz do workspace com outro lockfile solto em C:\Users\gusta.
  outputFileTracingRoot: path.join(__dirname),
  // Limite padrão (1mb) é menor que o upload de foto de perfil (até 2mb).
  experimental: {
    serverActions: {
      bodySizeLimit: "3mb",
    },
  },
};

export default nextConfig;
