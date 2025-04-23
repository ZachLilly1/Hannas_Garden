import React from "react";
import { useQuery } from "@tanstack/react-query";
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
          <h2 className="text-lg font-medium">All Plants</h2>
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
          ) : filteredPlants.length === 0 ? (
            searchTerm ? (
              <div className="text-center py-8 bg-white rounded-lg shadow-sm">
                <p className="text-neutral-dark opacity-70">No plants match your search.</p>
              </div>
            ) : (
              <div className="text-center py-8 bg-white rounded-lg shadow-sm">
                <p className="text-neutral-dark opacity-70">No plants yet.</p>
                <p className="text-sm text-primary mt-2">Add your first plant!</p>
              </div>
            )
          ) : (
            filteredPlants.map((plant) => (
              <PlantCard
                key={plant.id}
                plant={plant}
                onClick={() => openPlantDetail(plant)}
              />
            ))
          )}
        </div>
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
