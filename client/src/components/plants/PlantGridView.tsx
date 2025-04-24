import { usePlants } from "@/context/PlantContext";
import { getPlantStatus, getStatusColor } from "@/lib/utils";
import { WaterDropIcon, SunIcon } from "@/lib/icons";
import { CalendarIcon } from "lucide-react";
import { formatRelativeDate } from "@/lib/utils";
import { PlantWithCare } from "@shared/schema";

export default function PlantGridView() {
  const { getSortedPlants, openPlantDetail } = usePlants();
  const plants = getSortedPlants();

  // If no plants, show empty state
  if (plants.length === 0) {
    return (
      <div className="p-4 text-center">
        <p className="text-lg text-gray-500 dark:text-gray-400">
          You don't have any plants yet. Add your first plant to get started!
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 p-4">
      {plants.map((plant) => (
        <PlantGridCard
          key={plant.id}
          plant={plant}
          onClick={() => openPlantDetail(plant)}
        />
      ))}
    </div>
  );
}

interface PlantGridCardProps {
  plant: PlantWithCare;
  onClick: () => void;
}

function PlantGridCard({ plant, onClick }: PlantGridCardProps) {
  const status = getPlantStatus(plant);
  const statusColor = getStatusColor(status);

  return (
    <div 
      onClick={onClick}
      className="rounded-lg border bg-white dark:bg-gray-800 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col"
    >
      {/* Status indicator */}
      <div className={`h-1 ${statusColor} w-full`}></div>
      
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
          
          {/* Sunlight info */}
          <div className="flex items-center text-xs">
            <SunIcon className="h-3 w-3 text-yellow-500 mr-1" />
            <span className="text-gray-600 dark:text-gray-300">
              {plant.sunlightLevel || 'Unknown'}
            </span>
          </div>
          
          {/* Location */}
          <div className="flex items-center text-xs">
            <CalendarIcon className="h-3 w-3 text-gray-500 mr-1" />
            <span className="text-gray-600 dark:text-gray-300">
              Location: {plant.location}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}