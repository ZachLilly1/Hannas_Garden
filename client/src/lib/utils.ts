import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { addDays, format, differenceInDays, isBefore } from "date-fns";
import { type PlantWithCare } from "@shared/schema";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "N/A";
  return format(new Date(date), "MMM d, yyyy");
}

export function formatRelativeDate(date: Date | string | null | undefined): string {
  if (!date) return "N/A";
  
  const today = new Date();
  const targetDate = new Date(date);
  const diffDays = differenceInDays(targetDate, today);
  
  if (diffDays < 0) {
    return "Overdue";
  } else if (diffDays === 0) {
    return "Today";
  } else if (diffDays === 1) {
    return "Tomorrow";
  } else if (diffDays < 7) {
    return `${diffDays}d`;
  } else if (diffDays < 30) {
    return `${Math.floor(diffDays / 7)}w`;
  } else {
    return `${Math.floor(diffDays / 30)}m`;
  }
}

export function calculateNextCareDate(lastCareDate: Date | null, frequencyDays: number): Date {
  if (!lastCareDate) {
    return addDays(new Date(), frequencyDays);
  }
  return addDays(new Date(lastCareDate), frequencyDays);
}

export function getPlantStatus(plant: PlantWithCare): string {
  const today = new Date();
  
  if (plant.nextWatering && isBefore(plant.nextWatering, today)) {
    return "needs_water";
  }
  
  if (plant.nextFertilizing && isBefore(plant.nextFertilizing, today)) {
    return "needs_fertilizer";
  }
  
  return plant.status || "healthy";
}

export function getStatusLabel(status: string | null): string {
  switch (status) {
    case "healthy": return "Healthy";
    case "needs_water": return "Needs Water";
    case "needs_fertilizer": return "Needs Fertilizer";
    case "unhealthy": return "Unhealthy";
    case null: return "Healthy";
    default: return status || "Healthy";
  }
}

export function getStatusColor(status: string | null): string {
  switch (status) {
    case "healthy": return "text-status-success";
    case "needs_water": return "text-status-warning";
    case "needs_fertilizer": return "text-status-warning";
    case "unhealthy": return "text-status-danger";
    default: return "text-neutral-dark";
  }
}

export function getSunlightLabel(level: string): string {
  switch (level.toLowerCase()) {
    case "low": return "Low";
    case "medium": return "Medium";
    case "high": return "High";
    default: return level;
  }
}

export function getDefaultPlantImage(type: string): string {
  const typeMap: Record<string, string> = {
    "tropical": "https://images.pexels.com/photos/1084199/pexels-photo-1084199.jpeg",
    "succulent": "https://images.pexels.com/photos/1445419/pexels-photo-1445419.jpeg",
    "herb": "https://images.pexels.com/photos/1213859/pexels-photo-1213859.jpeg",
    "flowering": "https://images.pexels.com/photos/1005715/pexels-photo-1005715.jpeg",
    "fern": "https://images.pexels.com/photos/1084188/pexels-photo-1084188.jpeg"
  };
  
  return typeMap[type.toLowerCase()] || "https://images.pexels.com/photos/1084199/pexels-photo-1084199.jpeg";
}
