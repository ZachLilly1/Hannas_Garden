import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { WaterDropIcon, SunIcon, SeedlingIcon } from "@/lib/icons";
import { useQuery } from "@tanstack/react-query";
import { type PlantWithCare } from "@shared/schema";

interface CareSummaryProps {
  userId: number;
}

export function CareTaskSummary({ userId }: CareSummaryProps) {
  const { data, isLoading } = useQuery<{
    needsWater: PlantWithCare[];
    needsFertilizer: PlantWithCare[];
  }>({
    queryKey: ['/api/dashboard/care-needed'],
  });

  // Calculate plants needing different sunlight levels
  const { data: plants } = useQuery<PlantWithCare[]>({
    queryKey: ['/api/plants'],
  });

  const plantsNeedingSunlightChange = plants?.filter(plant => {
    if (!plant.guide) return false;
    return plant.guide.idealSunlight !== plant.sunlightLevel;
  }) || [];

  if (isLoading) {
    return (
      <Card className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-6">
        <h3 className="font-medium mb-3 dark:text-white">Today's Plant Care</h3>
        <div className="flex space-x-3">
          <div className="flex flex-col items-center bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg flex-1 animate-pulse">
            <div className="h-6 w-6 bg-blue-200 dark:bg-blue-700 rounded-full mb-1"></div>
            <div className="h-3 w-12 bg-gray-200 dark:bg-gray-700 mb-1"></div>
            <div className="h-4 w-8 bg-gray-300 dark:bg-gray-600"></div>
          </div>
          <div className="flex flex-col items-center bg-green-50 dark:bg-green-900/30 p-3 rounded-lg flex-1 animate-pulse">
            <div className="h-6 w-6 bg-green-200 dark:bg-green-700 rounded-full mb-1"></div>
            <div className="h-3 w-12 bg-gray-200 dark:bg-gray-700 mb-1"></div>
            <div className="h-4 w-8 bg-gray-300 dark:bg-gray-600"></div>
          </div>
        </div>
      </Card>
    );
  }

  const waterCount = data?.needsWater?.length || 0;
  const sunlightCount = plantsNeedingSunlightChange?.length || 0;
  const fertilizerCount = data?.needsFertilizer?.length || 0;

  return (
    <Card className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-6">
      <h3 className="font-medium mb-3 dark:text-white">Today's Plant Care</h3>
      <div className="flex space-x-3">
        <div className="flex flex-col items-center bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg flex-1">
          <div className="text-blue-500 dark:text-blue-400 mb-1">
            <WaterDropIcon className="h-6 w-6" />
          </div>
          <span className="text-xs text-neutral-dark dark:text-gray-300 opacity-70">Water</span>
          <span className="font-medium text-sm dark:text-white">{waterCount} plant{waterCount !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex flex-col items-center bg-green-50 dark:bg-green-900/30 p-3 rounded-lg flex-1">
          <div className="text-green-500 dark:text-green-400 mb-1">
            <SeedlingIcon className="h-6 w-6" />
          </div>
          <span className="text-xs text-neutral-dark dark:text-gray-300 opacity-70">Fertilize</span>
          <span className="font-medium text-sm dark:text-white">{fertilizerCount} plant{fertilizerCount !== 1 ? 's' : ''}</span>
        </div>
      </div>
    </Card>
  );
}

export default CareTaskSummary;
