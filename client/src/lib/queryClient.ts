import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Custom API error class to provide better error messages
class ApiError extends Error {
  status: number;
  
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

// Get a descriptive error message based on status code
function getErrorMessageForStatus(status: number, message: string): string {
  switch (status) {
    case 401:
      return 'Authentication required. Please login to continue.';
    case 403:
      return 'You do not have permission to perform this action.';
    case 404:
      return 'The requested resource was not found.';
    case 429:
      return 'Too many requests. Please try again later.';
    default:
      return status >= 500
        ? `Server error (${status}): ${message}`
        : `Error ${status}: ${message}`;
  }
}

// Extract error message from response
async function throwIfResNotOk(res: Response): Promise<void> {
  if (!res.ok) {
    let errorMessage = '';
    
    // Try to parse as JSON first
    try {
      const errorData = await res.json();
      errorMessage = errorData.message || errorData.error || JSON.stringify(errorData);
    } catch {
      // If it's not JSON, get it as text
      try {
        errorMessage = await res.text() || res.statusText;
      } catch {
        errorMessage = res.statusText;
      }
    }
    
    throw new ApiError(
      res.status,
      getErrorMessageForStatus(res.status, errorMessage)
    );
  }
}

// API request function with timeout support
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown,
  timeout = 30000, // 30 second timeout default
): Promise<Response> {
  // Create an AbortController to handle timeouts
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const res = await fetch(url, {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
      signal: controller.signal,
    });
    
    // Clear the timeout now that we have a response
    clearTimeout(timeoutId);
    
    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout/1000} seconds. Please try again.`);
    }
    throw error;
  }
}

// Query function for React Query
type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
  timeout?: number;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior, timeout = 30000 }) =>
  async ({ queryKey }) => {
    // Create an AbortController to handle timeouts
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const res = await fetch(queryKey[0] as string, {
        credentials: "include",
        signal: controller.signal,
      });

      // Clear the timeout now that we have a response
      clearTimeout(timeoutId);
      
      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout/1000} seconds. Please try again.`);
      }
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
