export function githubPagesBasePath() {
  if (process.env.GITHUB_PAGES !== "true") return "";
  const repositoryName =
    process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "beacons";
  return process.env.GITHUB_PAGES_BASE_PATH ?? `/${repositoryName}`;
}

export function publicAssetPath(path: `/${string}`) {
  return `${githubPagesBasePath()}${path}`;
}
