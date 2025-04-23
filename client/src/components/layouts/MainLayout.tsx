import React, { useState } from "react";
import { useLocation } from "wouter";
import { LeafIcon, SearchIcon, BellIcon } from "@/lib/icons";
import BottomNavigation from "@/components/ui/bottom-navigation";
import AddPlantModal from "@/components/plants/AddPlantModal";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [location] = useLocation();
  const [isAddPlantModalOpen, setIsAddPlantModalOpen] = useState(false);

  // Function to determine page title based on current route
  const getPageTitle = () => {
    switch (location) {
      case "/":
        return "GreenThumb";
      case "/schedule":
        return "Care Schedule";
      case "/guides":
        return "Plant Guides";
      case "/profile":
        return "My Profile";
      default:
        return "GreenThumb";
    }
  };

  return (
    <div className="flex flex-col min-h-screen max-w-md mx-auto relative pb-16">
      {/* Header */}
      <header className="p-4 bg-white shadow-sm sticky top-0 z-10">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <LeafIcon className="text-primary mr-2" />
            <h1 className="text-lg font-playfair font-semibold">{getPageTitle()}</h1>
          </div>
          <div className="flex items-center space-x-3">
            <button className="p-2 rounded-full hover:bg-neutral-medium transition">
              <SearchIcon className="h-5 w-5 text-neutral-dark" />
            </button>
            <button className="p-2 rounded-full hover:bg-neutral-medium transition">
              <BellIcon className="h-5 w-5 text-neutral-dark" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation onAddPlant={() => setIsAddPlantModalOpen(true)} />

      {/* Add Plant Modal */}
      <AddPlantModal 
        isOpen={isAddPlantModalOpen} 
        onClose={() => setIsAddPlantModalOpen(false)} 
      />
    </div>
  );
}

export default MainLayout;
