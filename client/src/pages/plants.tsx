import React from "react";
import { useQuery } from "@tanstack/react-query";
import { PlantCard } from "@/components/plants/PlantCard";
import PlantGridView from "@/components/plants/PlantGridView";
import { PlantDetailModal } from "@/components/plants/PlantDetailModal";
import { AddPlantModal } from "@/components/plants/AddPlantModal";
import { SortIcon } from "@/lib/icons";
import { usePlants } from "@/context/PlantContext";
import { useTheme } from "@/context/ThemeContext";
import { Button } from "@/components/ui/button";
import { ViewToggle } from "@/components/ui/view-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { type PlantWithCare } from "@shared/schema";

export default function Plants() {
  const {
    isLoading,
    getSortedPlants,
    sortOption,
    setSortOption,
    openPlantDetail,
    isPlantDetailOpen,
    closePlantDetail,
    selectedPlant,
    openEditPlant,
    isEditPlantOpen,
    closeEditPlant,
    plantToEdit,
  } = usePlants();
  
  const { viewMode } = useTheme();
  const [searchTerm, setSearchTerm] = useState("");

  const sortOptions = [
    { value: "name", label: "Name (A-Z)" },
    { value: "location", label: "Location" },
    { value: "water", label: "Water Needs" },
    { value: "type", label: "Plant Type" },
  ];

  const plants = getSortedPlants();
  
  // Filter plants based on search term
  const filteredPlants = plants.filter(plant => 
    plant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    plant.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
    plant.type.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  return (
    <>
      <section className="p-4">
        <div className="mb-4">
          <Input
            placeholder="Search plants by name, location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
        
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium dark:text-white">All Plants</h2>
          <div className="flex items-center gap-2">
            <ViewToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-primary text-sm">
                  <SortIcon className="h-4 w-4 mr-1" /> Sort by
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {sortOptions.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => setSortOption(option.value)}
                    className={sortOption === option.value ? "bg-primary/10" : ""}
                  >
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        {/* Plant Cards List */}
        {isLoading ? (
          // Loading skeleton - Use appropriate layout based on view mode
          <div className={viewMode === 'grid' ? "grid grid-cols-2 gap-4" : "space-y-4"}>
            {Array.from({ length: viewMode === 'grid' ? 4 : 3 }).map((_, index) => (
              viewMode === 'grid' ? (
                <div key={index} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
                  <Skeleton className="w-full h-32" />
                  <div className="p-3">
                    <Skeleton className="h-5 w-full mb-2" />
                    <Skeleton className="h-3 w-3/4 mb-3" />
                    <div className="space-y-2 mt-2">
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  </div>
                </div>
              ) : (
                <div key={index} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
                  <div className="flex">
                    <Skeleton className="w-24 h-24" />
                    <div className="flex-1 p-3">
                      <div className="flex justify-between items-start">
                        <Skeleton className="h-5 w-40 mb-2" />
                        <Skeleton className="h-4 w-20" />
                      </div>
                      <Skeleton className="h-3 w-24 mb-3" />
                      <div className="flex space-x-4 mt-3">
                        <Skeleton className="h-5 w-12" />
                        <Skeleton className="h-5 w-12" />
                        <Skeleton className="h-5 w-12" />
                      </div>
                    </div>
                  </div>
                </div>
              )
            ))}
          </div>
        ) : filteredPlants.length === 0 ? (
          // Empty state
          <div className="text-center py-8 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <p className="text-neutral-dark dark:text-gray-300 opacity-70">
              {searchTerm ? "No plants match your search." : "No plants yet."}
            </p>
            {!searchTerm && (
              <p className="text-sm text-primary mt-2">Add your first plant!</p>
            )}
          </div>
        ) : (
          // Plants list/grid view
          viewMode === 'grid' ? (
            <PlantGridView />
          ) : (
            <div className="space-y-4">
              {filteredPlants.map((plant) => (
                <PlantCard
                  key={plant.id}
                  plant={plant}
                  onClick={() => openPlantDetail(plant)}
                />
              ))}
            </div>
          )
        )}
      </section>

      {/* Plant Detail Modal */}
      <PlantDetailModal
        plant={selectedPlant}
        isOpen={isPlantDetailOpen}
        onClose={closePlantDetail}
        onEdit={openEditPlant}
      />

      {/* Edit Plant Modal */}
      <AddPlantModal
        isOpen={isEditPlantOpen}
        onClose={closeEditPlant}
        plantToEdit={plantToEdit}
      />
    </>
  );
}
