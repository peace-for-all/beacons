import type { NextConfig } from "next";
import { githubPagesBasePath } from "./lib/deployment";

const isGitHubPagesBuild = process.env.GITHUB_PAGES === "true";

const nextConfig: NextConfig = {
  ...(isGitHubPagesBuild
    ? {
        basePath: githubPagesBasePath(),
        output: "export" as const,
        trailingSlash: true,
      }
    : {}),
};

export default nextConfig;
