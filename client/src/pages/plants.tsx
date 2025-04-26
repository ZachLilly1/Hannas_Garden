import React from "react";
import { useQuery } from "@tanstack/react-query";
import { PlantCard } from "@/components/plants/PlantCard";
import { PlantDetailModal } from "@/components/plants/PlantDetailModal";
import { AddPlantModal } from "@/components/plants/AddPlantModal";
import { SortIcon, WaterDropIcon, LeafIcon, SunIcon, CameraIcon } from "@/lib/icons";
import { usePlants } from "@/context/PlantContext";
import { useTheme } from "@/context/ThemeContext";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { getStatusColor, formatRelativeDate } from "@/lib/utils";
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
import { Link } from "wouter";

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
  
  // We don't need theme-related variables anymore
  const [searchTerm, setSearchTerm] = useState("");

  const sortOptions = [
    { value: "name", label: "Name (A-Z)" },
    { value: "scientificName", label: "Scientific Name" },
    { value: "location", label: "Location" },
    { value: "water", label: "Water Needs" },
  ];

  const plants = getSortedPlants();
  
  // Filter plants based on search term
  const filteredPlants = plants.filter(plant => 
    plant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    plant.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (plant.scientificName && plant.scientificName.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  
  return (
    <>
      <section className="p-4">
        <div className="mb-4">
          <Input
            placeholder="Search plants by name, scientific name, location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
        
        {/* Quick access tools section */}
        <div className="mb-4 grid grid-cols-3 gap-2">
          <Link href="/tools/plant-identifier">
            <div className="flex flex-col items-center bg-emerald-50 dark:bg-emerald-900/30 p-3 rounded-lg">
              <CameraIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mb-1" />
              <span className="text-xs text-center">Identify Plant</span>
            </div>
          </Link>
          <Link href="/tools/plant-health-diagnostic">
            <div className="flex flex-col items-center bg-amber-50 dark:bg-amber-900/30 p-3 rounded-lg">
              <LeafIcon className="h-5 w-5 text-amber-600 dark:text-amber-400 mb-1" />
              <span className="text-xs text-center">Health Check</span>
            </div>
          </Link>
          <Link href="/tools/light-meter">
            <div className="flex flex-col items-center bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg">
              <SunIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 mb-1" />
              <span className="text-xs text-center">Light Meter</span>
            </div>
          </Link>
        </div>
        
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium dark:text-white">All Plants</h2>
          <div className="flex items-center gap-2">
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
          // Loading skeleton for list view
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
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
          // Always use list view
          <div className="space-y-4">
            {filteredPlants.map((plant) => (
              <PlantCard
                key={plant.id}
                plant={plant}
                onClick={() => openPlantDetail(plant)}
              />
            ))}
          </div>
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
