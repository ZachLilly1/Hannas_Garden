import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LeafIcon, SunIcon, WaterDropIcon } from "@/lib/icons";
import { useTheme } from "@/context/ThemeContext";

const onboardingSteps = [
  {
    title: "Welcome to Hanna's Garden",
    description: "Your personal plant care assistant that helps you keep your plants happy and healthy.",
    icon: <LeafIcon className="h-16 w-16 text-primary mb-4" />,
    image: "/onboarding-welcome.svg",
  },
  {
    title: "Track Your Plants",
    description: "Add your plants and we'll help you track when they need water, fertilizer, and other care.",
    icon: <WaterDropIcon className="h-16 w-16 text-blue-500 mb-4" />,
    image: "/onboarding-track.svg",
  },
  {
    title: "Get Smart Reminders",
    description: "Receive care reminders based on each plant's specific needs and your local conditions.",
    icon: <SunIcon className="h-16 w-16 text-yellow-500 mb-4" />,
    image: "/onboarding-remind.svg",
  }
];

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
  const { completeOnboarding } = useTheme();
  const [currentStep, setCurrentStep] = useState(0);
  
  const handleNext = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };
  
  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };
  
  const handleComplete = () => {
    completeOnboarding();
    onClose();
  };
  
  const currentStepData = onboardingSteps[currentStep];
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto p-0 rounded-lg overflow-hidden">
        <DialogHeader className="p-6 bg-gradient-to-r from-green-50 to-blue-50 flex flex-col items-center text-center">
          <div className="rounded-full bg-white p-4 shadow-sm mb-2">
            {currentStepData.icon}
          </div>
          <DialogTitle className="text-xl font-semibold">
            {currentStepData.title}
          </DialogTitle>
          <div className="mt-6 w-full flex justify-center">
            {onboardingSteps.map((_, index) => (
              <div 
                key={index}
                className={`h-2 w-10 mx-1 rounded-full ${
                  index === currentStep ? 'bg-primary' : 'bg-neutral-200'
                }`}
              />
            ))}
          </div>
        </DialogHeader>
        
        <div className="p-6">
          <p className="text-center mb-6 text-neutral-700">
            {currentStepData.description}
          </p>
          
          <div className="flex justify-center mb-6">
            {/* Placeholder for illustrations - replace with actual images */}
            <div className="h-48 w-full bg-neutral-100 rounded-lg flex items-center justify-center text-neutral-400">
              {currentStepData.image ? (
                <img 
                  src={currentStepData.image} 
                  alt={currentStepData.title} 
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                "Illustration"
              )}
            </div>
          </div>
        </div>
        
        <DialogFooter className="p-4 border-t border-neutral-100">
          <div className="flex w-full justify-between">
            <Button 
              variant="ghost" 
              onClick={handleBack}
              disabled={currentStep === 0}
            >
              Back
            </Button>
            <Button onClick={handleNext}>
              {currentStep < onboardingSteps.length - 1 ? "Next" : "Get Started"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}