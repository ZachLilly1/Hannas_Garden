// CSRF token management helper
let csrfToken: string | null = null;

/**
 * Fetch a CSRF token from the server
 * This needs to be called before making any state-changing requests
 */
export async function fetchCsrfToken(): Promise<string> {
  try {
    if (csrfToken) {
      return csrfToken;
    }
    
    const response = await fetch('/api/auth/csrf-token');
    if (!response.ok) {
      throw new Error('Failed to fetch CSRF token');
    }
    
    const data = await response.json();
    csrfToken = data.csrfToken;
    
    if (!csrfToken) {
      throw new Error('Invalid CSRF token received');
    }
    
    return csrfToken;
  } catch (error) {
    console.error('Error fetching CSRF token:', error);
    throw error;
  }
}

/**
 * Include CSRF token in request options
 */
export function withCsrf(options: RequestInit = {}): RequestInit {
  if (!csrfToken) {
    console.warn('CSRF token not available. Call fetchCsrfToken() first.');
    return options;
  }
  
  const headers = {
    ...options.headers,
    'CSRF-Token': csrfToken,
  };
  
  return {
    ...options,
    headers,
  };
}

/**
 * Clear stored CSRF token (e.g., on logout)
 */
export function clearCsrfToken(): void {
  csrfToken = null;
}