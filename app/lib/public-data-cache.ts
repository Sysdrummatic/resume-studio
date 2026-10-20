import { unstable_cache } from "next/cache";
import { cache } from "react";
import { getAccessRestriction } from "./access-restriction";
import { ACCESS_RESTRICTION_CACHE_TAG, PUBLIC_CV_CACHE_TAG } from "./public-cache-invalidation";
import { fetchPublishedResumePresetByPublicLink, type PublishedResumePublicRoute } from "./resume-server";

// Cache of the Supabase reads behind public pages (ADR 0026). HTML itself stays dynamic.

const PUBLIC_CV_TTL_SECONDS = 300;
const ACCESS_RESTRICTION_TTL_SECONDS = 60;

class NotPublishedError extends Error {}

// A thrown error is never cached, so a missing CV (or a transient lookup failure that
// resolves to null) is looked up again instead of serving a cached 404.
const resolvePublishedRoute = unstable_cache(
  async (personSlug: string, publicId: string, locale: string | undefined) => {
    const route = await fetchPublishedResumePresetByPublicLink(personSlug, publicId, locale);
    if (!route) throw new NotPublishedError();
    return route;
  },
  ["public-cv-route"],
  { revalidate: PUBLIC_CV_TTL_SECONDS, tags: [PUBLIC_CV_CACHE_TAG] },
);

// react `cache` shares one lookup between generateMetadata and the page of a request.
export const getPublishedRoute = cache(
  async (personSlug: string, publicId: string, locale?: string): Promise<PublishedResumePublicRoute | null> => {
    try {
      return await resolvePublishedRoute(personSlug, publicId, locale);
    } catch (error) {
      if (error instanceof NotPublishedError) return null;
      throw error;
    }
  },
);

export const getCachedAccessRestriction = unstable_cache(getAccessRestriction, ["access-restriction"], {
  revalidate: ACCESS_RESTRICTION_TTL_SECONDS,
  tags: [ACCESS_RESTRICTION_CACHE_TAG],
});
