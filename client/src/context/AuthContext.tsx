import { createContext, ReactNode, useContext, useState, useEffect } from "react";
import { 
  useQuery, 
  useMutation, 
  QueryClient
} from "@tanstack/react-query";
import { User, loginSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Types
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

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: Error | null;
  logout: () => Promise<void>;
  login: (data: LoginData) => Promise<User>;
  register: (data: RegisterData) => Promise<User>;
  updateProfile: (data: Partial<User>) => Promise<User>;
};

// Create Context
const AuthContext = createContext<AuthContextType | null>(null);

// Provider Component
export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  // Fetch current user
  const { 
    data: user, 
    error, 
    isLoading,
    refetch
  } = useQuery<User | null, Error>({
    queryKey: ['/api/auth/user'],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', '/api/auth/user');
        if (res.status === 401) {
          setIsAuthenticated(false);
          return null;
        }
        
        setIsAuthenticated(true);
        return await res.json();
      } catch (error) {
        setIsAuthenticated(false);
        return null;
      }
    },
    retry: false
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (data: LoginData) => {
      const res = await apiRequest('POST', '/api/auth/login', data);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Login failed');
      }
      return res.json();
    },
    onSuccess: (data: User) => {
      setIsAuthenticated(true);
      queryClient.setQueryData(['/api/auth/user'], data);
      toast({
        title: 'Login Successful',
        description: `Welcome back, ${data.displayName || data.username}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Login Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async (data: RegisterData) => {
      const res = await apiRequest('POST', '/api/auth/register', data);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Registration failed');
      }
      return res.json();
    },
    onSuccess: (data: User) => {
      setIsAuthenticated(true);
      queryClient.setQueryData(['/api/auth/user'], data);
      toast({
        title: 'Registration Successful',
        description: `Welcome, ${data.displayName || data.username}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Registration Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/auth/logout');
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Logout failed');
      }
      return true;
    },
    onSuccess: () => {
      setIsAuthenticated(false);
      queryClient.setQueryData(['/api/auth/user'], null);
      queryClient.invalidateQueries();
      toast({
        title: 'Logged Out',
        description: 'You have been logged out successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Logout Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: Partial<User>) => {
      const res = await apiRequest('PUT', '/api/auth/profile', data);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Profile update failed');
      }
      return res.json();
    },
    onSuccess: (data: User) => {
      queryClient.setQueryData(['/api/auth/user'], data);
      toast({
        title: 'Profile Updated',
        description: 'Your profile has been updated successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Update Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Convenience methods
  const login = async (data: LoginData) => {
    return await loginMutation.mutateAsync(data);
  };

  const register = async (data: RegisterData) => {
    return await registerMutation.mutateAsync(data);
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  const updateProfile = async (data: Partial<User>) => {
    return await updateProfileMutation.mutateAsync(data);
  };

  // Context value
  const value = {
    user: user || null,
    isLoading,
    isAuthenticated,
    error,
    login,
    logout,
    register,
    updateProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook for using the auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}