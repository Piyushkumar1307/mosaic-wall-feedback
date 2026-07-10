import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

// Parent lockfile at ~/package-lock.json would otherwise break Turbopack dev.
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  devIndicators: false,
  turbopack: {
    root: projectRoot,
  },
};

export default nextConfig;
