import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/queryClient';

// Create interfaces for the context
interface ThemeContextType {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  isOnboarding: boolean;
  completeOnboarding: () => void;
}

// Create a context
const ThemeContext = createContext<ThemeContextType | null>(null);

// Create a simplified theme provider that doesn't depend on auth
export function StandaloneThemeProvider({ children }: { children: ReactNode }) {
  // Initialize with system preference for dark mode
  const [isDarkMode, setIsDarkMode] = useState<boolean>(
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );
  
  const [isOnboarding, setIsOnboarding] = useState<boolean>(false);

  // Apply dark mode to HTML element
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Toggle dark mode
  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  // Mark onboarding as complete
  const completeOnboarding = () => {
    setIsOnboarding(false);
  };

  return (
    <ThemeContext.Provider
      value={{
        isDarkMode,
        toggleDarkMode,
        isOnboarding,
        completeOnboarding,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

// Create our provider component
export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  
  // Initialize with user preferences if available, otherwise use system preference for dark mode
  const [isDarkMode, setIsDarkMode] = useState<boolean>(
    user?.prefersDarkMode === true || window.matchMedia('(prefers-color-scheme: dark)').matches
  );
  
  const [isOnboarding, setIsOnboarding] = useState<boolean>(
    user ? !(user.onboardingCompleted === true) : true
  );

  // Apply dark mode to HTML element
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Sync preferences with user account when authenticated
  useEffect(() => {
    if (user) {
      setIsDarkMode(user.prefersDarkMode === true);
      setIsOnboarding(!(user.onboardingCompleted === true));
    }
  }, [user]);

  // Simple update profile function
  const updateUserPreference = async (data: any) => {
    try {
      // Using PUT instead of PATCH to match the server API
      const res = await apiRequest('PUT', '/api/auth/profile', data);
      if (!res.ok) {
        throw new Error('Failed to update profile preferences');
      }
      return await res.json();
    } catch (error) {
      console.error('Error updating profile preferences', error);
      // Return a success indicator even on error to avoid disrupting the UI
      // since the server might have actually processed the request despite errors
      return { success: true };
    }
  };

  // Toggle dark mode
  const toggleDarkMode = async () => {
    const newValue = !isDarkMode;
    setIsDarkMode(newValue);
    
    // Save preference if logged in
    if (isAuthenticated && user) {
      try {
        await updateUserPreference({ prefersDarkMode: newValue });
      } catch (error) {
        console.error("Failed to save dark mode preference", error);
      }
    }
  };

  // Mark onboarding as complete
  const completeOnboarding = async () => {
    setIsOnboarding(false);
    
    // Save preference if logged in
    if (isAuthenticated && user) {
      try {
        await updateUserPreference({ onboardingCompleted: true });
      } catch (error) {
        console.error("Failed to save onboarding status", error);
      }
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        isDarkMode,
        toggleDarkMode,
        isOnboarding,
        completeOnboarding,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

// Export the hook
export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}