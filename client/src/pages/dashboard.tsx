import React from "react";
import { useQuery } from "@tanstack/react-query";
import { CareTaskSummary } from "@/components/dashboard/CareTaskSummary";
import { PlantCard } from "@/components/plants/PlantCard";
import { PlantDetailModal } from "@/components/plants/PlantDetailModal";
import { AddPlantModal } from "@/components/plants/AddPlantModal";
import { SortIcon } from "@/lib/icons";
import { usePlants } from "@/context/PlantContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { ComponentErrorBoundary } from "@/components/error/ErrorBoundary";
import { type PlantWithCare } from "@shared/schema";

export default function Dashboard() {
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

  // Get plants needing care for the dashboard
  const { data: careNeeded } = useQuery<{
    needsWater: PlantWithCare[];
    needsFertilizer: PlantWithCare[];
  }>({
    queryKey: ['/api/dashboard/care-needed'],
  });

  const sortOptions = [
    { value: "name", label: "Name (A-Z)" },
    { value: "location", label: "Location" },
    { value: "water", label: "Water Needs" },
    { value: "type", label: "Plant Type" },
  ];

  const plants = getSortedPlants();
  
  return (
    <>
      <section className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium">My Garden</h2>
          <span className="text-sm text-neutral-dark">
            {isLoading ? "..." : `${plants.length} plants`}
          </span>
        </div>
        
        {/* Care Tasks Summary */}
        <ComponentErrorBoundary>
          <CareTaskSummary userId={0} /> {/* userId is determined on the server from the session */}
        </ComponentErrorBoundary>
      </section>
      
      {/* Plants Collection */}
      <section className="p-4 pt-0">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium">My Plants</h2>
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
        
        {/* Plant Cards List */}
        <ComponentErrorBoundary>
          <div className="space-y-4">
            {isLoading ? (
              // Loading skeleton
              Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="bg-white rounded-lg shadow-sm overflow-hidden">
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
              ))
            ) : plants.length === 0 ? (
              <div className="text-center py-8 bg-white rounded-lg shadow-sm">
                <p className="text-neutral-dark opacity-70">No plants yet.</p>
                <p className="text-sm text-primary mt-2">Add your first plant!</p>
              </div>
            ) : (
              plants.map((plant) => (
                <PlantCard
                  key={plant.id}
                  plant={plant}
                  onClick={() => openPlantDetail(plant)}
                />
              ))
            )}
          </div>
        </ComponentErrorBoundary>
      </section>

      {/* Plant Detail Modal */}
      <ComponentErrorBoundary>
        <PlantDetailModal
          plant={selectedPlant}
          isOpen={isPlantDetailOpen}
          onClose={closePlantDetail}
          onEdit={openEditPlant}
        />
      </ComponentErrorBoundary>

      {/* Edit Plant Modal */}
      <ComponentErrorBoundary>
        <AddPlantModal
          isOpen={isEditPlantOpen}
          onClose={closeEditPlant}
          plantToEdit={plantToEdit}
        />
      </ComponentErrorBoundary>
    </>
  );
}
