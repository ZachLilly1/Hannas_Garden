import React from "react";
import { differenceInDays } from "date-fns";
import { getStatusColor, getStatusLabel, getDefaultPlantImage } from "@/lib/utils";
import { HeartPulseIcon, WaterDropIcon } from "@/lib/icons";
import { CareIndicator } from "./CareIndicator";
import { Card } from "@/components/ui/card";
import { type PlantWithCare } from "@shared/schema";

type PlantCardProps = {
  plant: PlantWithCare;
  onClick: () => void;
};

export function PlantCard({ plant, onClick }: PlantCardProps) {
  // Calculate water level (inverse percentage - lower means needs water soon)
  const calculateWaterLevel = () => {
    if (!plant.nextWatering || !plant.lastWatered) return 20;
    const today = new Date();
    const totalDays = plant.waterFrequency;
    const daysRemaining = differenceInDays(new Date(plant.nextWatering), today);
    
    if (daysRemaining < 0) return 5; // Overdue
    return Math.min(100, Math.max(5, (daysRemaining / totalDays) * 100));
  };

  // Calculate fertilizer level
  const calculateFertilizerLevel = () => {
    if (!plant.nextFertilizing || !plant.lastFertilized) return 20;
    const today = new Date();
    const totalDays = plant.fertilizerFrequency;
    const daysRemaining = differenceInDays(new Date(plant.nextFertilizing), today);
    
    if (daysRemaining < 0) return 5; // Overdue
    return Math.min(100, Math.max(5, (daysRemaining / totalDays) * 100));
  };

  // Format days remaining string
  const getWaterRemainingText = () => {
    if (!plant.nextWatering) return "N/A";
    const today = new Date();
    const daysRemaining = differenceInDays(new Date(plant.nextWatering), today);
    
    if (daysRemaining < 0) return "Now";
    if (daysRemaining === 0) return "Today";
    return `${daysRemaining}d`;
  };

  const getFertilizerRemainingText = () => {
    if (!plant.nextFertilizing) return "N/A";
    const today = new Date();
    const daysRemaining = differenceInDays(new Date(plant.nextFertilizing), today);
    
    if (daysRemaining < 0) return "Now";
    if (daysRemaining === 0) return "Today";
    if (daysRemaining < 7) return `${daysRemaining}d`;
    return `${Math.floor(daysRemaining / 7)}w`;
  };

  // Determine sunlight opacity based on level
  const getSunlightOpacity = () => {
    switch (plant.sunlightLevel.toLowerCase()) {
      case "low": return 25;
      case "medium": return 50;
      case "high": return 80;
      default: return 50;
    }
  };

  // Get sunlight label
  const getSunlightLabel = () => {
    switch (plant.sunlightLevel.toLowerCase()) {
      case "low": return "Low";
      case "medium": return "Med";
      case "high": return "High";
      default: return plant.sunlightLevel;
    }
  };

  const statusClassName = getStatusColor(plant.status);

  const waterLevel = calculateWaterLevel();
  const fertilizerLevel = calculateFertilizerLevel();
  const sunlightOpacity = getSunlightOpacity();
  const waterRemainingText = getWaterRemainingText();
  const fertilizerRemainingText = getFertilizerRemainingText();
  const isWaterUrgent = waterRemainingText === "Now";
  const isFertilizerUrgent = fertilizerRemainingText === "Now";

  return (
    <Card 
      className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden" 
      onClick={onClick}
    >
      <div className="flex">
        <div className="w-24 h-24 overflow-hidden bg-neutral-100 dark:bg-gray-700">
          {plant.image ? (
            <img
              src={plant.image}
              alt={plant.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-neutral-400 dark:text-gray-500">
              No Image
            </div>
          )}
        </div>
        <div className="flex-1 p-3">
          <div className="flex justify-between items-start">
            <h3 className="font-medium dark:text-white">{plant.name}</h3>
            <span className={`text-xs flex items-center gap-1 ${statusClassName}`}>
              <HeartPulseIcon className="h-3 w-3" /> {getStatusLabel(plant.status)}
            </span>
          </div>
          <p className="text-xs text-neutral-dark dark:text-gray-400 opacity-70 mb-2">{plant.location}</p>

          {/* Plant Care Indicators */}
          <div className="flex space-x-4 mt-1">
            {/* Water Indicator */}
            <CareIndicator
              type="water"
              label={waterRemainingText}
              level={100 - waterLevel}
              isUrgent={isWaterUrgent}
              title={`Needs water in ${waterRemainingText}`}
            />

            {/* Sunlight Indicator */}
            <CareIndicator
              type="sunlight"
              label={getSunlightLabel()}
              level={sunlightOpacity}
              title={`${getSunlightLabel()} sunlight exposure`}
            />

            {/* Fertilizer Indicator */}
            <CareIndicator
              type="fertilizer"
              label={fertilizerRemainingText}
              level={100 - fertilizerLevel}
              isUrgent={isFertilizerUrgent}
              title={`Fertilize in ${fertilizerRemainingText}`}
            />
          </div>
        </div>
      </div>
    </Card>
  );
}

export default PlantCard;
