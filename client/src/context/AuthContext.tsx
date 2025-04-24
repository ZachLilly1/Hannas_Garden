import { createContext, useContext, ReactNode, useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
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
        const res = await fetch('/api/auth/user', {
          credentials: 'include'
        });
        
        if (res.status === 401) {
          // This is expected when not logged in, return null silently
          return null;
        }
        
        if (!res.ok) {
          throw new Error(`Error ${res.status}: ${res.statusText}`);
        }
        
        return await res.json();
      } catch (err) {
        // Only log real errors, not 401s
        if (!(err instanceof Error && err.message.includes('401'))) {
          console.error('Failed to fetch user:', err);
        }
        return null;
      }
    },
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Set error from query
  useEffect(() => {
    if (userError) {
      setError(userError as Error);
    }
  }, [userError]);

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (data: LoginData) => {
      const res = await apiRequest('POST', '/api/auth/login', data);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Login failed');
      }
      return await res.json();
    },
    onSuccess: (data: User) => {
      setError(null);
      queryClient.setQueryData(['/api/auth/user'], data);
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

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async (data: RegisterData) => {
      const res = await apiRequest('POST', '/api/auth/register', {
        username: data.username,
        email: data.email,
        password: data.password,
        displayName: data.displayName || null,
        preferredUnits: 'metric',
        notificationsEnabled: true,
        timezone: 'UTC',
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Registration failed');
      }
      return await res.json();
    },
    onSuccess: (data: User) => {
      setError(null);
      queryClient.setQueryData(['/api/auth/user'], data);
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

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/auth/logout');
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Logout failed');
      }
      return res;
    },
    onSuccess: () => {
      queryClient.setQueryData(['/api/auth/user'], null);
      // Clear out only user-specific queries
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const queryKey = query.queryKey[0];
          // Only invalidate api queries, not ui state queries
          return typeof queryKey === 'string' && queryKey.startsWith('/api/');
        }
      });
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

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: UpdateProfileData) => {
      const res = await apiRequest('PUT', '/api/auth/profile', data);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Profile update failed');
      }
      return await res.json();
    },
    onSuccess: (data: User) => {
      queryClient.setQueryData(['/api/auth/user'], data);
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