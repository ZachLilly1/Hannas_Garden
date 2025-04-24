import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { OnboardingModal } from '@/components/onboarding/OnboardingModal';

export function useOnboarding() {
  const { user, isAuthenticated } = useAuth();
  const { isOnboarding } = useTheme();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const onboardingShown = useRef(false);
  
  // Show onboarding modal only once when user is logged in and hasn't completed onboarding
  useEffect(() => {
    if (isAuthenticated && user && isOnboarding && !onboardingShown.current) {
      // Mark as shown to prevent multiple occurrences
      onboardingShown.current = true;
      
      // Add a small delay to avoid showing the modal immediately on login
      const timer = setTimeout(() => {
        setShowOnboarding(true);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, user, isOnboarding]);
  
  // Render the onboarding modal
  const OnboardingComponent = () => {
    if (!isAuthenticated || !isOnboarding) return null;
    
    return (
      <OnboardingModal 
        isOpen={showOnboarding} 
        onClose={() => setShowOnboarding(false)} 
      />
    );
  };
  
  return {
    showOnboarding,
    setShowOnboarding,
    OnboardingComponent
  };
}