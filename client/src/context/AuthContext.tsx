import { createContext, useContext, ReactNode, useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { clearCsrfToken } from "@/lib/csrf";
import { useToast } from "@/hooks/use-toast";

type LoginData = {
  username: string;
  password: string;
};

type RegisterData = {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  displayName?: string;
};

type UpdateProfileData = {
  displayName?: string;
  email?: string;
  preferredUnits?: string;
  timezone?: string;
  notificationsEnabled?: boolean;
  avatarUrl?: string;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: Error | null;
  logout: () => Promise<void>;
  login: (data: LoginData) => Promise<User>;
  register: (data: RegisterData) => Promise<User>;
  updateProfile: (data: UpdateProfileData) => Promise<User>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [error, setError] = useState<Error | null>(null);

  // Fetch the current user
  const { 
    data: user, 
    isLoading, 
    error: userError, 
    refetch 
  } = useQuery<User | null>({
    queryKey: ['/api/auth/user'],
    queryFn: async () => {
      try {
        // Use fetch directly instead of apiRequest to handle 401 gracefully
        console.log('Fetching user authentication state...');
        const res = await fetch('/api/auth/user', {
          credentials: 'include',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        
        if (res.status === 401) {
          // This is expected when not logged in, return null silently
          console.log('Not authenticated (401)');
          return null;
        }
        
        if (!res.ok) {
          throw new Error(`Error ${res.status}: ${res.statusText}`);
        }
        
        const userData = await res.json();
        console.log('User authenticated:', userData.username);
        return userData;
      } catch (err) {
        // Only log real errors, not 401s
        if (!(err instanceof Error && err.message.includes('401'))) {
          console.error('Failed to fetch user:', err);
        }
        return null;
      }
    },
    retry: 1, // Try twice in case of network issues
    retryDelay: 1000,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true, // Refresh when window gains focus
  });

  // Set error from query
  useEffect(() => {
    if (userError) {
      setError(userError as Error);
    }
  }, [userError]);

  // Login mutation using apiRequest for consistent API access
  const loginMutation = useMutation({
    mutationFn: async (data: LoginData) => {
      // Try the direct login endpoint first (development environment) 
      try {
        console.log('Trying direct login...');
        const res = await apiRequest('POST', '/api/auth/direct-login', data);
        const userData = await res.json();
        return userData;
      } catch (error) {
        console.log('Direct login failed, trying standard login...');
        // Fall back to standard login endpoint
        const res = await apiRequest('POST', '/api/auth/login', data);
        const userData = await res.json();
        return userData;
      }
    },
    onSuccess: (data: User) => {
      setError(null);
      // Update the cached user data
      queryClient.setQueryData(['/api/auth/user'], data);
      
      // Force a refetch to ensure we have fresh session data
      setTimeout(() => refetch(), 500);
      
      toast({
        title: "Login successful",
        description: `Welcome back, ${data.displayName || data.username}!`,
      });
    },
    onError: (error: Error) => {
      setError(error);
      toast({
        title: "Login failed",
        description: error.message || "Please check your credentials and try again",
        variant: "destructive",
      });
    },
  });

  // Register mutation using apiRequest for consistent API access
  const registerMutation = useMutation({
    mutationFn: async (data: RegisterData) => {
      // Prepare the registration payload with defaults
      const payload = {
        username: data.username,
        email: data.email,
        password: data.password,
        displayName: data.displayName || null,
        preferredUnits: 'metric',
        notificationsEnabled: true,
        timezone: 'UTC',
      };
      
      // Use apiRequest which handles CSRF tokens and error handling
      const res = await apiRequest('POST', '/api/auth/register', payload);
      const userData = await res.json();
      return userData;
    },
    onSuccess: (data: User) => {
      setError(null);
      // Update the cached user data
      queryClient.setQueryData(['/api/auth/user'], data);
      
      // Force a refetch to ensure we have fresh session data
      setTimeout(() => refetch(), 500);
      
      toast({
        title: "Registration successful",
        description: `Welcome to Hanna's Garden, ${data.displayName || data.username}!`,
      });
    },
    onError: (error: Error) => {
      setError(error);
      toast({
        title: "Registration failed",
        description: error.message || "Please try a different username or email",
        variant: "destructive",
      });
    },
  });

  // Logout mutation using apiRequest to properly handle CSRF token
  const logoutMutation = useMutation({
    mutationFn: async () => {
      console.log('Attempting to logout...');
      try {
        // Use apiRequest which will properly handle CSRF token fetching
        const res = await apiRequest('POST', '/api/auth/logout');
        console.log('Logout response:', res.status);
        return res;
      } catch (error) {
        console.error('Logout error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      // Clear the CSRF token to prevent using old tokens
      clearCsrfToken();
      
      // Clear user data from cache immediately
      queryClient.setQueryData(['/api/auth/user'], null);
      
      // Clear out all API queries
      queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey[0];
          return typeof queryKey === 'string' && queryKey.startsWith('/api/');
        }
      });
      
      // Force a window reload to reset all state
      // This is the most reliable way to ensure clean logout
      setTimeout(() => {
        window.location.href = '/auth';
      }, 500);
      
      toast({
        title: "Logged out",
        description: "You have been logged out successfully",
      });
    },
    onError: (error: Error) => {
      setError(error);
      toast({
        title: "Logout failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  // Update profile mutation using apiRequest to properly handle CSRF token
  const updateProfileMutation = useMutation({
    mutationFn: async (data: UpdateProfileData) => {
      // Use apiRequest which will properly handle CSRF token fetching
      const res = await apiRequest('PUT', '/api/auth/profile', data);
      const userData = await res.json();
      return userData;
    },
    onSuccess: (data: User) => {
      // Update cached user data
      queryClient.setQueryData(['/api/auth/user'], data);
      
      // Force a refetch to ensure we have fresh session data
      setTimeout(() => refetch(), 500);
      
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully",
      });
    },
    onError: (error: Error) => {
      setError(error);
      toast({
        title: "Update failed",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const login = async (data: LoginData) => {
    return loginMutation.mutateAsync(data);
  };

  const register = async (data: RegisterData) => {
    return registerMutation.mutateAsync(data);
  };

  const logout = async () => {
    // Fetch a fresh CSRF token first to ensure we have one before logout
    try {
      console.log('Fetching fresh CSRF token before logout');
      const csrfRes = await fetch('/api/auth/csrf-token');
      const csrfData = await csrfRes.json();
      console.log('Got CSRF token, first 8 chars:', csrfData.csrfToken.substring(0, 8));
    } catch (error) {
      console.error('Error fetching CSRF token:', error);
    }
    
    // Now try to logout
    await logoutMutation.mutateAsync();
  };

  const updateProfile = async (data: UpdateProfileData) => {
    return updateProfileMutation.mutateAsync(data);
  };

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        isLoading,
        isAuthenticated: !!user,
        error,
        login,
        logout,
        register,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}