/**
 * Authenticated fetch wrapper that automatically handles token refresh
 */

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

async function refreshToken(): Promise<boolean> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = fetch('/api/auth/refresh', {
    method: 'POST',
    credentials: 'include',
  })
    .then((response) => {
      isRefreshing = false;
      refreshPromise = null;
      return response.ok;
    })
    .catch((error) => {
      isRefreshing = false;
      refreshPromise = null;
      console.error('Token refresh failed:', error);
      return false;
    });

  return refreshPromise;
}

export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // Make the initial request
  let response = await fetch(url, {
    ...options,
    credentials: 'include',
  });

  // If we get a 401, try to refresh the token
  if (response.status === 401) {
    const refreshSuccess = await refreshToken();

    if (refreshSuccess) {
      // Retry the original request with the new token
      response = await fetch(url, {
        ...options,
        credentials: 'include',
      });
      
      // If still 401 after refresh, the refresh token might be expired
      // Only redirect if we're still unauthorized after refresh
      if (response.status === 401 && typeof window !== 'undefined') {
        // Check if this is a critical endpoint that requires auth
        const criticalEndpoints = ['/api/auth/me', '/api/notifications', '/api/comments/create'];
        const isCritical = criticalEndpoints.some(endpoint => url.includes(endpoint));
        
        if (isCritical) {
          // Only redirect for critical endpoints, not for every failed request
          const currentPath = window.location.pathname;
          // Don't redirect if already on login page
          if (!currentPath.startsWith('/login')) {
            window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
          }
        }
      }
    } else {
      // Refresh failed - only redirect if we're in browser and not already on login
      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname;
        // Only redirect for critical auth endpoints
        const criticalEndpoints = ['/api/auth/me', '/api/notifications', '/api/comments/create'];
        const isCritical = criticalEndpoints.some(endpoint => url.includes(endpoint));
        
        if (isCritical && !currentPath.startsWith('/login')) {
          window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
        }
      }
    }
  }

  return response;
}

