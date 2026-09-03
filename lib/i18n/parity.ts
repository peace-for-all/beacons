type LocaleTree = { readonly [key: string]: string | LocaleTree };

function leafPaths(tree: LocaleTree, prefix = ""): string[] {
  return Object.entries(tree).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === "string" ? [path] : leafPaths(value, path);
  });
}

export function findLocaleParityErrors(
  reference: LocaleTree,
  candidate: LocaleTree,
) {
  const referencePaths = new Set(leafPaths(reference));
  const candidatePaths = new Set(leafPaths(candidate));
  return {
    missing: [...referencePaths].filter((path) => !candidatePaths.has(path)).sort(),
    extra: [...candidatePaths].filter((path) => !referencePaths.has(path)).sort(),
  };
}

export function assertLocaleParity(
  reference: LocaleTree,
  candidate: LocaleTree,
) {
  const errors = findLocaleParityErrors(reference, candidate);
  if (errors.missing.length || errors.extra.length) {
    throw new Error(
      `Locale parity failed; missing: ${errors.missing.join(", ") || "none"}; extra: ${errors.extra.join(", ") || "none"}`,
    );
  }
}
