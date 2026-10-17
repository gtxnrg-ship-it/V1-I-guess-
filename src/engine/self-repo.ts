export const DEFAULT_SELF_REPO = "gtxnrg-ship-it/kuro-chan";

/** Normalize a configured repository URL/name without creating or guessing a different target. */
export function resolveSelfRepo(configured?: string | null): string {
  return (configured?.trim() || DEFAULT_SELF_REPO)
    .replace(/^https?:\/\/github\.com\//i, "")
    .replace(/\.git$/i, "")
    .replace(/\/$/, "");
}
