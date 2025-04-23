import React from "react";
import { cn } from "@/lib/utils";
import { WaterDropIcon, SunIcon, SeedlingIcon } from "@/lib/icons";

type CareIndicatorProps = {
  type: "water" | "sunlight" | "fertilizer";
  label: string;
  level: number; // 0-100 percentage
  fillColor?: string;
  borderColor?: string; 
  iconColor?: string;
  isUrgent?: boolean;
  title?: string;
};

export function CareIndicator({
  type,
  label,
  level,
  fillColor,
  borderColor,
  iconColor,
  isUrgent = false,
  title,
}: CareIndicatorProps) {
  const getIcon = () => {
    switch (type) {
      case "water":
        return <WaterDropIcon className="text-xs absolute inset-0 flex items-center justify-center" />;
      case "sunlight":
        return <SunIcon className="text-xs absolute inset-0 flex items-center justify-center" />;
      case "fertilizer":
        return <SeedlingIcon className="text-xs absolute inset-0 flex items-center justify-center" />;
    }
  };

  const getDefaultColors = () => {
    switch (type) {
      case "water":
        return {
          fill: isUrgent ? "bg-status-danger" : "bg-blue-400",
          border: isUrgent ? "border-status-danger" : "border-blue-200",
          icon: "text-white"
        };
      case "sunlight":
        return {
          fill: "bg-yellow-400",
          border: "border-yellow-200",
          icon: "text-white"
        };
      case "fertilizer":
        return {
          fill: isUrgent ? "bg-status-danger" : "bg-green-400",
          border: isUrgent ? "border-status-danger" : "border-green-200",
          icon: "text-white"
        };
    }
  };

  const colors = getDefaultColors();
  
  return (
    <div className="flex items-center" title={title}>
      <div className="h-5 w-5 relative mr-2">
        <div className={cn("absolute inset-0 rounded-full border", borderColor || colors.border)}></div>
        
        {/* For water indicator - special shape */}
        {type === "water" && (
          <div 
            className={cn(
              "absolute bottom-0 left-0 right-0",
              fillColor || colors.fill,
              "water-drop-shape"
            )}
            style={{ height: `${level}%` }}
          ></div>
        )}
        
        {/* For sunlight indicator - rounded shape */}
        {type === "sunlight" && (
          <div 
            className={cn(
              "absolute inset-0 rounded-full",
              fillColor || colors.fill
            )}
            style={{ opacity: level / 100 }}
          ></div>
        )}
        
        {/* For fertilizer indicator - regular fill */}
        {type === "fertilizer" && (
          <div 
            className={cn(
              "absolute bottom-0 left-0 right-0",
              fillColor || colors.fill
            )}
            style={{ height: `${level}%` }}
          ></div>
        )}
        
        <div className={cn("absolute inset-0 flex items-center justify-center", iconColor || colors.icon)}>
          {getIcon()}
        </div>
      </div>
      <span className={cn("text-xs", isUrgent ? "text-status-danger font-medium" : "")}>{label}</span>
    </div>
  );
}

export default CareIndicator;
