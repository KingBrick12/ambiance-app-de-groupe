import { apiRequest } from "./apiClient";
import { cachedQuery, FRONTEND_CACHE } from "./queryCache";

export function getCurrentAmbiance(slug, { force = false } = {}) {
  return cachedQuery(["ambiance", slug, "current"],
    () => apiRequest(`/ambiance/${encodeURIComponent(slug)}/current`), {
      staleTimeMs: FRONTEND_CACHE.CURRENT_STALE_MS,
      tags: ["ambiance", `location:${slug}`],
      force
    });
}

export function getAmbianceHistory(slug, period = "all", { force = false } = {}) {
  return cachedQuery(["ambiance", slug, "history", period],
    () => apiRequest(`/ambiance/${encodeURIComponent(slug)}/history?last=${period}`), {
      staleTimeMs: FRONTEND_CACHE.STABLE_STALE_MS,
      tags: ["ambiance", `location:${slug}`],
      force
    });
}

export function getQuietHours(slug, { force = false } = {}) {
  return cachedQuery(["ambiance", slug, "quiet-hours"],
    () => apiRequest(`/ambiance/${encodeURIComponent(slug)}/quiet-hours`), {
      staleTimeMs: FRONTEND_CACHE.STABLE_STALE_MS,
      tags: ["ambiance", `location:${slug}`],
      force
    });
}
