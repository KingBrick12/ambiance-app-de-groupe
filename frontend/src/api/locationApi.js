import { apiRequest } from "./apiClient";
import { cachedQuery, FRONTEND_CACHE } from "./queryCache";

export async function getLocations({ force = false } = {}) {
  return cachedQuery(["locations"], async () => {
    const response = await apiRequest("/locations");

    return {
      locations: Array.isArray(response.data) ? response.data : [],
      meta: response.meta || {}
    };
  }, {
    staleTimeMs: FRONTEND_CACHE.LOCATIONS_STALE_MS,
    tags: ["locations", "ambiance"],
    force
  });
}

export async function getLocation(slug, { force = false } = {}) {
  if (!slug) {
    throw new Error("Le slug du lieu est obligatoire.");
  }

  return cachedQuery(["location", slug], async () => {
    const response = await apiRequest(`/locations/${encodeURIComponent(slug)}`);
    return response.data;
  }, {
    staleTimeMs: FRONTEND_CACHE.STABLE_STALE_MS,
    tags: ["locations", `location:${slug}`],
    force
  });
}
