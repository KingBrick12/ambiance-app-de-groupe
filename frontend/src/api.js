import { invalidatePublicQueries } from './api/queryCache'

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '')
const TOKEN_KEY = 'ambiance_session'
let onUnauthorized = null

export const session = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => token ? localStorage.setItem(TOKEN_KEY, token) : localStorage.removeItem(TOKEN_KEY),
  onUnauthorized: (callback) => { onUnauthorized = callback },
}

async function request(path, options = {}) {
  const token = session.get()
  const headers = { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers }
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  })
  const payload = await response.json().catch(() => ({}))
  if (response.status === 401 && token) onUnauthorized?.()
  if (!response.ok) throw new Error(payload.message || 'Une erreur est survenue.')
  return payload
}

export const api = {
  register: (body) => request('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  me: () => request('/api/auth/me'),
  contributions: () => request('/api/account/contributions'),
  contributedLocations: () => request('/api/account/locations'),
  favorites: () => request('/api/account/favorites'),
  locations: () => request('/api/account/available-locations'),
  addFavorite: (location) => request(`/api/account/favorites/${encodeURIComponent(location)}`, { method: 'POST' }),
  removeFavorite: (location) => request(`/api/account/favorites/${encodeURIComponent(location)}`, { method: 'DELETE' }),
  addObservation: async (body) => {
    const result = await request('/api/observations', { method: 'POST', body: JSON.stringify(body) })
    invalidatePublicQueries(body.location)
    return result
  },
}
