import { revalidateTag } from "next/cache";

// Tags of the public data cache (ADR 0026). Kept apart from the readers so mutation code can invalidate without importing them.
export const PUBLIC_CV_CACHE_TAG = "public-cv";
export const ACCESS_RESTRICTION_CACHE_TAG = "access-restriction";

function expireTag(tag: string): void {
  try {
    revalidateTag(tag, { expire: 0 });
  } catch (error) {
    // The TTL still bounds staleness; a failed invalidation must not fail the mutation.
    console.warn(`[cache] could not expire tag ${tag}`, error instanceof Error ? error.message : error);
  }
}

// Call after anything that changes what a public link serves (publish, unpublish, account deletion).
export function revalidatePublicCv(): void {
  expireTag(PUBLIC_CV_CACHE_TAG);
}

export function revalidateAccessRestriction(): void {
  expireTag(ACCESS_RESTRICTION_CACHE_TAG);
}
