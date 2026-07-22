import { apiRequest } from "./apiClient";

export function getCurrentAmbiance(slug) {
  return apiRequest(`/ambiance/${encodeURIComponent(slug)}/current`);
}

export function getAmbianceHistory(slug, period = "all") {
  return apiRequest(`/ambiance/${encodeURIComponent(slug)}/history?last=${period}`);
}

export function getQuietHours(slug) {
  return apiRequest(`/ambiance/${encodeURIComponent(slug)}/quiet-hours`);
}
