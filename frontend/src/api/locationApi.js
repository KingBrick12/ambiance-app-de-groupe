import { apiRequest } from "./apiClient";

export async function getLocations() {
  const response = await apiRequest("/locations");

  return {
    locations: Array.isArray(response.data) ? response.data : [],
    meta: response.meta || {}
  };
}

export async function getLocation(slug) {
  if (!slug) {
    throw new Error("Le slug du lieu est obligatoire.");
  }

  const response = await apiRequest(
    `/locations/${encodeURIComponent(slug)}`
  );

  return response.data;
}
