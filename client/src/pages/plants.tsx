import React from "react";
import { useQuery } from "@tanstack/react-query";
import { PlantCard } from "@/components/plants/PlantCard";
import PlantGridView from "@/components/plants/PlantGridView";
import { PlantDetailModal } from "@/components/plants/PlantDetailModal";
import { AddPlantModal } from "@/components/plants/AddPlantModal";
import { SortIcon, WaterDropIcon, LeafIcon, SunIcon, CameraIcon } from "@/lib/icons";
import { usePlants } from "@/context/PlantContext";
import { useTheme } from "@/context/ThemeContext";
import { Button } from "@/components/ui/button";
import { ViewToggle } from "@/components/ui/view-toggle";
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
            <div className="grid grid-cols-2 gap-4">
              {filteredPlants.map((plant) => (
                <div key={plant.id} className="plant-grid-item">
                  {/* Use the same component from PlantGridView but pass filtered plants */}
                  <div 
                    onClick={() => openPlantDetail(plant)}
                    className="rounded-lg border bg-white dark:bg-gray-800 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col"
                  >
                    {/* Status indicator */}
                    <div className={`h-1 ${getStatusColor(plant.status)} w-full`}></div>
                    
                    {/* Image */}
                    <div className="h-32 bg-neutral-100 dark:bg-gray-700 relative">
                      {plant.image ? (
                        <img 
                          src={plant.image} 
                          alt={plant.name} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-neutral-400 dark:text-gray-500">
                          No Image
                        </div>
                      )}
                    </div>
                    
                    {/* Content */}
                    <div className="p-3 flex flex-col flex-1">
                      <h3 className="font-medium text-sm mb-1 truncate dark:text-white">{plant.name}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 italic mb-2 truncate">{plant.type}</p>
                      
                      <div className="mt-auto space-y-1">
                        {/* Watering info */}
                        <div className="flex items-center text-xs">
                          <WaterDropIcon className="h-3 w-3 text-blue-500 mr-1" />
                          <span className="text-gray-600 dark:text-gray-300">
                            {plant.nextWatering ? formatRelativeDate(plant.nextWatering) : 'Not set'}
                          </span>
                        </div>
                        
                        {/* Location */}
                        <div className="flex items-center text-xs">
                          <CalendarIcon className="h-3 w-3 text-gray-500 mr-1" />
                          <span className="text-gray-600 dark:text-gray-300">
                            {plant.location}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
