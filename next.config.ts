import type { NextConfig } from "next";
import { withEve } from "eve/next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["puppeteer-core", "@puppeteer/browsers"],
  experimental: {
    optimizePackageImports: ["lucide-react", "motion"],
  },
};

export default withEve(nextConfig);
