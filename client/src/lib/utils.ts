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

/**
 * Compresses an image to reduce file size and improve upload performance.
 * 
 * @param imageDataUrl - The image data URL to compress
 * @param maxWidth - Maximum width (default 1200px)
 * @param quality - JPEG quality (0-1, default 0.7)
 * @returns Promise resolving to a compressed image data URL
 */
export function compressImage(
  imageDataUrl: string,
  maxWidth = 1200,
  quality = 0.7
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Create an image to load the data URL
    const img = new Image();
    img.onload = () => {
      // Create canvas for resizing
      const canvas = document.createElement('canvas');
      
      // Calculate new dimensions while maintaining aspect ratio
      let width = img.width;
      let height = img.height;
      
      if (width > maxWidth) {
        const scaleFactor = maxWidth / width;
        width = maxWidth;
        height = Math.round(height * scaleFactor);
      }
      
      // Set canvas dimensions and draw image
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      // Draw image with white background (to handle transparency)
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convert to data URL with specified quality
      const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
      
      // Check if compression actually helped
      if (compressedDataUrl.length > imageDataUrl.length && !imageDataUrl.startsWith('data:image/png')) {
        // If original is smaller and it's not a PNG (which we're converting to JPEG), return original
        resolve(imageDataUrl);
      } else {
        resolve(compressedDataUrl);
      }
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image for compression'));
    };
    
    img.src = imageDataUrl;
  });
}

/**
 * Displays a human-readable file size
 * 
 * @param bytes - Size in bytes
 * @returns Formatted string (e.g. "2.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export function getDefaultPlantImage(nameOrType: string | null): string {
  if (!nameOrType) {
    return "https://images.pexels.com/photos/1084199/pexels-photo-1084199.jpeg"; // Default image
  }
  
  const nameOrTypeLower = nameOrType.toLowerCase();
  
  // Check for specific keywords in the scientific name to categorize the plant
  if (nameOrTypeLower.includes("monstera") || nameOrTypeLower.includes("philodendron") || 
      nameOrTypeLower.includes("palm") || nameOrTypeLower.includes("tropical")) {
    return "https://images.pexels.com/photos/1084199/pexels-photo-1084199.jpeg"; // Tropical
  }
  
  if (nameOrTypeLower.includes("cactus") || nameOrTypeLower.includes("succulent") || 
      nameOrTypeLower.includes("aloe") || nameOrTypeLower.includes("echeveria")) {
    return "https://images.pexels.com/photos/1445419/pexels-photo-1445419.jpeg"; // Succulent
  }
  
  if (nameOrTypeLower.includes("herb") || nameOrTypeLower.includes("mint") || 
      nameOrTypeLower.includes("basil") || nameOrTypeLower.includes("thyme") || 
      nameOrTypeLower.includes("rosemary") || nameOrTypeLower.includes("sage")) {
    return "https://images.pexels.com/photos/1213859/pexels-photo-1213859.jpeg"; // Herb
  }
  
  if (nameOrTypeLower.includes("flower") || nameOrTypeLower.includes("rosa") || 
      nameOrTypeLower.includes("tulip") || nameOrTypeLower.includes("lily") || 
      nameOrTypeLower.includes("orchid")) {
    return "https://images.pexels.com/photos/1005715/pexels-photo-1005715.jpeg"; // Flowering
  }
  
  if (nameOrTypeLower.includes("fern") || nameOrTypeLower.includes("nephrolepis") || 
      nameOrTypeLower.includes("pteridophyta")) {
    return "https://images.pexels.com/photos/1084188/pexels-photo-1084188.jpeg"; // Fern
  }
  
  // Fall back to traditional type-based mapping if no matches found
  const typeMap: Record<string, string> = {
    "tropical": "https://images.pexels.com/photos/1084199/pexels-photo-1084199.jpeg",
    "succulent": "https://images.pexels.com/photos/1445419/pexels-photo-1445419.jpeg",
    "herb": "https://images.pexels.com/photos/1213859/pexels-photo-1213859.jpeg",
    "flowering": "https://images.pexels.com/photos/1005715/pexels-photo-1005715.jpeg",
    "fern": "https://images.pexels.com/photos/1084188/pexels-photo-1084188.jpeg",
    "identified": "https://images.pexels.com/photos/1084199/pexels-photo-1084199.jpeg" // For plants identified via API
  };
  
  return typeMap[nameOrTypeLower] || "https://images.pexels.com/photos/1084199/pexels-photo-1084199.jpeg";
}
