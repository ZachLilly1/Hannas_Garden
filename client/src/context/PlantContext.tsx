import React, { createContext, useContext, ReactNode, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { type PlantWithCare } from "@shared/schema";

interface PlantContextType {
  plants: PlantWithCare[];
  isLoading: boolean;
  error: Error | null;
  selectedPlant: PlantWithCare | null;
  setSelectedPlant: (plant: PlantWithCare | null) => void;
  isPlantDetailOpen: boolean;
  openPlantDetail: (plant: PlantWithCare) => void;
  closePlantDetail: () => void;
  isEditPlantOpen: boolean;
  openEditPlant: (plant: PlantWithCare) => void;
  closeEditPlant: () => void;
  plantToEdit: PlantWithCare | null;
  sortOption: string;
  setSortOption: (option: string) => void;
  getSortedPlants: () => PlantWithCare[];
}

const PlantContext = createContext<PlantContextType | undefined>(undefined);

export function PlantProvider({ children }: { children: ReactNode }) {
  const [selectedPlant, setSelectedPlant] = useState<PlantWithCare | null>(null);
  const [isPlantDetailOpen, setIsPlantDetailOpen] = useState(false);
  const [isEditPlantOpen, setIsEditPlantOpen] = useState(false);
  const [plantToEdit, setPlantToEdit] = useState<PlantWithCare | null>(null);
  const [sortOption, setSortOption] = useState<string>("location");

  // Fetch plants using React Query
  const { data: plants = [], isLoading, error } = useQuery<PlantWithCare[]>({
    queryKey: ['/api/plants'],
  });

  const openPlantDetail = (plant: PlantWithCare) => {
    setSelectedPlant(plant);
    setIsPlantDetailOpen(true);
  };

  const closePlantDetail = () => {
    setIsPlantDetailOpen(false);
  };

  const openEditPlant = (plant: PlantWithCare) => {
    setPlantToEdit(plant);
    setIsEditPlantOpen(true);
  };

  const closeEditPlant = () => {
    setIsEditPlantOpen(false);
    setPlantToEdit(null);
  };

  // Function to get sorted plants based on current sort option
  const getSortedPlants = () => {
    if (!plants || plants.length === 0) return [];

    const sorted = [...plants];
    
    switch (sortOption) {
      case "name":
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case "location":
        return sorted.sort((a, b) => a.location.localeCompare(b.location));
      case "water": 
        return sorted.sort((a, b) => {
          // Sort by water need (null values last)
          if (!a.nextWatering) return 1;
          if (!b.nextWatering) return -1;
          return new Date(a.nextWatering).getTime() - new Date(b.nextWatering).getTime();
        });
      case "type":
        return sorted.sort((a, b) => a.type.localeCompare(b.type));
      default:
        return sorted;
    }
  };

  return (
    <PlantContext.Provider
      value={{
        plants,
        isLoading,
        error: error as Error | null,
        selectedPlant,
        setSelectedPlant,
        isPlantDetailOpen,
        openPlantDetail,
        closePlantDetail,
        isEditPlantOpen,
        openEditPlant,
        closeEditPlant,
        plantToEdit,
        sortOption,
        setSortOption,
        getSortedPlants
      }}
    >
      {children}
    </PlantContext.Provider>
  );
}

export function usePlants() {
  const context = useContext(PlantContext);
  if (context === undefined) {
    throw new Error("usePlants must be used within a PlantProvider");
  }
  return context;
}
