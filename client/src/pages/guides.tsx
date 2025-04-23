import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SunIcon, WaterDropIcon, SeedlingIcon, CircleDotIcon } from "@/lib/icons";
import { Skeleton } from "@/components/ui/skeleton";
import { type PlantGuide } from "@shared/schema";

export default function Guides() {
  const { data: guides, isLoading } = useQuery<PlantGuide[]>({
    queryKey: ['/api/plant-guides'],
  });

  const getSunlightIcon = (level: string) => {
    switch (level.toLowerCase()) {
      case "low":
        return <div className="relative w-5 h-5">
          <SunIcon className="text-yellow-500 opacity-25 w-full h-full" />
        </div>;
      case "medium":
        return <div className="relative w-5 h-5">
          <SunIcon className="text-yellow-500 opacity-50 w-full h-full" />
        </div>;
      case "high":
        return <div className="relative w-5 h-5">
          <SunIcon className="text-yellow-500 opacity-80 w-full h-full" />
        </div>;
      default:
        return <SunIcon className="text-yellow-500 w-5 h-5" />;
    }
  };

  const renderGuideCard = (guide: PlantGuide) => {
    const wateringFrequency = guide.idealWaterFrequency === 1 
      ? "Daily" 
      : guide.idealWaterFrequency < 7 
        ? `Every ${guide.idealWaterFrequency} days` 
        : guide.idealWaterFrequency === 7 
          ? "Weekly"
          : guide.idealWaterFrequency === 14
            ? "Biweekly"
            : guide.idealWaterFrequency === 30
              ? "Monthly"
              : `Every ${guide.idealWaterFrequency} days`;

    const fertilizingFrequency = guide.idealFertilizerFrequency === 0
      ? "Not needed"
      : guide.idealFertilizerFrequency === 7
        ? "Weekly"
        : guide.idealFertilizerFrequency === 14
          ? "Biweekly"
          : guide.idealFertilizerFrequency === 30
            ? "Monthly"
            : guide.idealFertilizerFrequency === 90
              ? "Quarterly"
              : `Every ${guide.idealFertilizerFrequency} days`;

    const sunlightLabel = guide.idealSunlight.charAt(0).toUpperCase() + guide.idealSunlight.slice(1);

    return (
      <Card key={guide.id} className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg capitalize">{guide.plantType} Plants</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-neutral-dark mb-4">{guide.description}</p>
          
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="flex flex-col items-center p-2 bg-blue-50 rounded-lg">
              <WaterDropIcon className="text-blue-500 mb-1" />
              <span className="text-xs text-center">{wateringFrequency}</span>
            </div>
            <div className="flex flex-col items-center p-2 bg-yellow-50 rounded-lg">
              {getSunlightIcon(guide.idealSunlight)}
              <span className="text-xs text-center">{sunlightLabel}</span>
            </div>
            <div className="flex flex-col items-center p-2 bg-green-50 rounded-lg">
              <SeedlingIcon className="text-green-500 mb-1" />
              <span className="text-xs text-center">{fertilizingFrequency}</span>
            </div>
          </div>
          
          <h4 className="font-medium mb-2 text-sm">Care Tips</h4>
          <ul className="text-sm space-y-2">
            {guide.careTips.split('.').filter(tip => tip.trim()).map((tip, index) => (
              <li key={index} className="flex items-start">
                <CircleDotIcon className="h-3 w-3 mt-1 mr-2 text-primary" />
                <span>{tip.trim()}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    );
  };

  const renderSkeletonGuide = () => (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <Skeleton className="h-6 w-32" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-3/4 mb-4" />
        
        <div className="grid grid-cols-3 gap-2 mb-4">
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
        </div>
        
        <Skeleton className="h-5 w-24 mb-2" />
        <Skeleton className="h-4 w-full mb-1" />
        <Skeleton className="h-4 w-full mb-1" />
        <Skeleton className="h-4 w-3/4" />
      </CardContent>
    </Card>
  );

  return (
    <div className="p-4">
      <h2 className="text-lg font-medium mb-4">Plant Care Guides</h2>
      
      {isLoading ? (
        <>
          {renderSkeletonGuide()}
          {renderSkeletonGuide()}
        </>
      ) : !guides || guides.length === 0 ? (
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-neutral-dark opacity-70">No plant guides available</p>
          </CardContent>
        </Card>
      ) : (
        guides.map(guide => renderGuideCard(guide))
      )}
    </div>
  );
}
