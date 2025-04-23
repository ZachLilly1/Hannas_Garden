import React from "react";
import { usePlants } from "@/context/PlantContext";
import { Card, CardContent } from "@/components/ui/card";
import { WaterDropIcon, SunIcon, SeedlingIcon } from "@/lib/icons";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatRelativeDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PlantDetailModal } from "@/components/plants/PlantDetailModal";
import { AddPlantModal } from "@/components/plants/AddPlantModal";
import { differenceInDays } from "date-fns";
import { type PlantWithCare } from "@shared/schema";

export default function CareSchedule() {
  const {
    plants,
    isLoading,
    openPlantDetail,
    isPlantDetailOpen,
    closePlantDetail,
    selectedPlant,
    openEditPlant,
    isEditPlantOpen,
    closeEditPlant,
    plantToEdit,
  } = usePlants();

  // Helper function to determine if care is needed today
  const isCareNeededToday = (date: Date | null): boolean => {
    if (!date) return false;
    const daysRemaining = differenceInDays(new Date(date), new Date());
    return daysRemaining <= 0;
  };

  // Group plants by care type
  const groupPlantsByCare = () => {
    const today = new Date();
    
    // Water
    const wateringPlants = [...plants].sort((a, b) => {
      if (!a.nextWatering) return 1;
      if (!b.nextWatering) return -1;
      return new Date(a.nextWatering).getTime() - new Date(b.nextWatering).getTime();
    });
    
    // Fertilizer
    const fertilizingPlants = [...plants].sort((a, b) => {
      if (!a.nextFertilizing) return 1;
      if (!b.nextFertilizing) return -1;
      return new Date(a.nextFertilizing).getTime() - new Date(b.nextFertilizing).getTime();
    });
    
    // Sunlight changes needed
    const sunlightPlants = plants.filter(plant => {
      if (!plant.guide) return false;
      return plant.guide.idealSunlight !== plant.sunlightLevel;
    });
    
    return { wateringPlants, fertilizingPlants, sunlightPlants };
  };

  const { wateringPlants, fertilizingPlants, sunlightPlants } = groupPlantsByCare();

  // Render a plant item in the care schedule
  const renderPlantItem = (plant: PlantWithCare, careType: 'water' | 'fertilize' | 'sunlight') => {
    let statusText = '';
    let isUrgent = false;
    
    if (careType === 'water') {
      statusText = plant.nextWatering ? formatRelativeDate(plant.nextWatering) : 'Not set';
      isUrgent = isCareNeededToday(plant.nextWatering);
    } else if (careType === 'fertilize') {
      statusText = plant.nextFertilizing ? formatRelativeDate(plant.nextFertilizing) : 'Not set';
      isUrgent = isCareNeededToday(plant.nextFertilizing);
    } else if (careType === 'sunlight') {
      const currentLevel = plant.sunlightLevel;
      const idealLevel = plant.guide?.idealSunlight;
      statusText = `${currentLevel} → ${idealLevel}`;
      isUrgent = true; // Sunlight issues are always somewhat urgent
    }

    return (
      <div 
        key={`${plant.id}-${careType}`} 
        className={`p-3 rounded-lg mb-2 flex items-center ${isUrgent ? 'bg-red-50' : 'bg-neutral-medium bg-opacity-30'}`}
        onClick={() => openPlantDetail(plant)}
      >
        <div className="flex-shrink-0 mr-3">
          <div 
            className="w-10 h-10 rounded-full bg-cover bg-center"
            style={{ backgroundImage: `url(${plant.image || 'https://images.pexels.com/photos/1084199/pexels-photo-1084199.jpeg'})` }}
          />
        </div>
        <div className="flex-grow">
          <h3 className="font-medium">{plant.name}</h3>
          <p className="text-xs text-neutral-dark opacity-70">{plant.location}</p>
        </div>
        <div className={`text-sm font-medium ${isUrgent ? 'text-status-danger' : ''}`}>
          {statusText}
        </div>
      </div>
    );
  };

  // Skeleton loader for care items
  const renderSkeletonItems = (count: number) => {
    return Array.from({ length: count }).map((_, i) => (
      <div key={i} className="p-3 rounded-lg mb-2 flex items-center bg-neutral-medium bg-opacity-30">
        <Skeleton className="w-10 h-10 rounded-full mr-3" />
        <div className="flex-grow">
          <Skeleton className="h-4 w-24 mb-1" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-4 w-12" />
      </div>
    ));
  };

  return (
    <>
      <div className="p-4">
        <Tabs defaultValue="water" className="w-full">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="water" className="flex items-center gap-1">
              <WaterDropIcon className="h-4 w-4" /> Water
            </TabsTrigger>
            <TabsTrigger value="sunlight" className="flex items-center gap-1">
              <SunIcon className="h-4 w-4" /> Sunlight
            </TabsTrigger>
            <TabsTrigger value="fertilize" className="flex items-center gap-1">
              <SeedlingIcon className="h-4 w-4" /> Fertilize
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="water" className="mt-0">
            <h2 className="text-lg font-medium mb-3">Watering Schedule</h2>
            <div className="space-y-1">
              {isLoading ? (
                renderSkeletonItems(3)
              ) : wateringPlants.length === 0 ? (
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-neutral-dark opacity-70">No plants to water</p>
                  </CardContent>
                </Card>
              ) : (
                wateringPlants.map(plant => renderPlantItem(plant, 'water'))
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="sunlight" className="mt-0">
            <h2 className="text-lg font-medium mb-3">Sunlight Adjustments</h2>
            <div className="space-y-1">
              {isLoading ? (
                renderSkeletonItems(2)
              ) : sunlightPlants.length === 0 ? (
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-neutral-dark opacity-70">All plants have ideal sunlight</p>
                  </CardContent>
                </Card>
              ) : (
                sunlightPlants.map(plant => renderPlantItem(plant, 'sunlight'))
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="fertilize" className="mt-0">
            <h2 className="text-lg font-medium mb-3">Fertilizing Schedule</h2>
            <div className="space-y-1">
              {isLoading ? (
                renderSkeletonItems(3)
              ) : fertilizingPlants.length === 0 ? (
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-neutral-dark opacity-70">No plants to fertilize</p>
                  </CardContent>
                </Card>
              ) : (
                fertilizingPlants.map(plant => renderPlantItem(plant, 'fertilize'))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

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
