import { apiRequest } from "./apiClient";

export async function getLocations() {
  const response = await apiRequest("/locations");
  return response.data;
}

export async function getLocation(slug) {
  const response = await apiRequest(`/locations/${encodeURIComponent(slug)}`);
  return response.data;
}
