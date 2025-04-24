import React, { useState } from "react";
import { useLocation } from "wouter";
import { LeafIcon, SearchIcon, BellIcon } from "@/lib/icons";
import BottomNavigation from "@/components/ui/bottom-navigation";
import AddPlantModal from "@/components/plants/AddPlantModal";
import { useOnboarding } from "@/hooks/use-onboarding";
import { useTheme } from "@/context/ThemeContext";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { SimpleViewToggle } from "@/components/ui/view-toggle";
import SearchModal from "@/components/search/SearchModal";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [location] = useLocation();
  const [isAddPlantModalOpen, setIsAddPlantModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const { isDarkMode } = useTheme();
  const { OnboardingComponent } = useOnboarding();

  // Function to determine page title based on current route
  const getPageTitle = () => {
    switch (location) {
      case "/":
        return "Hanna's Garden";
      case "/schedule":
        return "Care Schedule";
      case "/guides":
        return "Plant Guides";
      case "/profile":
        return "My Profile";
      case "/tools":
        return "Garden Tools";
      case "/tools/light-meter":
        return "Light Meter";
      default:
        return "Hanna's Garden";
    }
  };

  return (
    <div className={`flex flex-col min-h-screen max-w-md mx-auto relative pb-16 ${isDarkMode ? 'dark' : ''}`}>
      {/* Header */}
      <header className="p-4 bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-10">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <LeafIcon className="text-primary mr-2" />
            <h1 className="text-lg font-playfair font-semibold dark:text-white">{getPageTitle()}</h1>
          </div>
          <div className="flex items-center space-x-2">
            <ThemeToggle />
            {location === "/" && <SimpleViewToggle />}
            <button 
              onClick={() => setIsSearchModalOpen(true)}
              className="p-2 rounded-full hover:bg-neutral-medium dark:hover:bg-gray-700 transition"
              aria-label="Search plants"
            >
              <SearchIcon className="h-5 w-5 text-neutral-dark dark:text-gray-300" />
            </button>
            <button className="p-2 rounded-full hover:bg-neutral-medium dark:hover:bg-gray-700 transition">
              <BellIcon className="h-5 w-5 text-neutral-dark dark:text-gray-300" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 dark:bg-gray-900 dark:text-white">
        {children}
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation onAddPlant={() => setIsAddPlantModalOpen(true)} />

      {/* Add Plant Modal */}
      <AddPlantModal 
        isOpen={isAddPlantModalOpen} 
        onClose={() => setIsAddPlantModalOpen(false)} 
      />
      
      {/* Onboarding Component */}
      <OnboardingComponent />
      
      {/* Search Modal */}
      <SearchModal 
        isOpen={isSearchModalOpen} 
        onClose={() => setIsSearchModalOpen(false)} 
      />
    </div>
  );
}

export default MainLayout;
