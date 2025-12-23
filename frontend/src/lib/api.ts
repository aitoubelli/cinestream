// frontend/src/lib/api.ts
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3000/api';

export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (response.status === 401) {
    // Rediriger vers login si non authentifié
    window.location.href = '/auth/login';
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

// Auth API
export async function login(email: string, password: string) {
  return fetchWithAuth('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function register(email: string, password: string, name: string) {
  return fetchWithAuth('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name }),
  });
}

export async function logout() {
  return fetchWithAuth('/auth/logout', {
    method: 'POST',
  });
}

export async function getProfile() {
  return fetchWithAuth('/user/profile');
}

// Content API
export async function getTrending() {
  return fetchWithAuth('/content/trending');
}

export async function getContentById(type: string, id: string) {
  return fetchWithAuth(`/content/${type}/${id}`);
}

// Interactions API
export async function postRating(contentId: number, contentType: string, score: number) {
  return fetchWithAuth('/interactions/ratings', {
    method: 'POST',
    body: JSON.stringify({ contentId, contentType, score }),
  });
}

export async function postComment(contentId: number, contentType: string, text: string) {
  return fetchWithAuth('/interactions/comments', {
    method: 'POST',
    body: JSON.stringify({ contentId, contentType, text }),
  });
}

export async function addToWatchlist(contentId: number, contentType: string) {
  return fetchWithAuth('/interactions/watchlist', {
    method: 'POST',
    body: JSON.stringify({ contentId, contentType }),
  });
}

export async function removeFromWatchlist(contentId: number) {
  return fetchWithAuth(`/interactions/watchlist/${contentId}`, {
    method: 'DELETE',
  });
}

export async function getWatchlist() {
  return fetchWithAuth('/interactions/watchlist');
}

// Notifications API
export async function getNotifications() {
  return fetchWithAuth('/notifications');
}

export async function markNotificationAsRead(id: string) {
  return fetchWithAuth(`/notifications/${id}/read`, {
    method: 'PATCH',
  });
}

export async function markAllNotificationsAsRead() {
  return fetchWithAuth('/notifications/read-all', {
    method: 'PATCH',
  });
}
