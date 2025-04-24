import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { OnboardingModal } from '@/components/onboarding/OnboardingModal';

export function useOnboarding() {
  const { user, isAuthenticated } = useAuth();
  const { isOnboarding } = useTheme();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const onboardingShown = useRef(false);
  
  // Permanently store onboarding display state in sessionStorage
  useEffect(() => {
    // Check if we've already shown onboarding this session
    const onboardingCompleted = sessionStorage.getItem('onboardingCompleted') === 'true';
    
    // Only show onboarding if user is authenticated, onboarding is needed, 
    // and it hasn't been shown this session
    if (isAuthenticated && user && isOnboarding && !onboardingCompleted && !onboardingShown.current) {
      // Mark as shown to prevent multiple occurrences
      onboardingShown.current = true;
      sessionStorage.setItem('onboardingCompleted', 'true');
      
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