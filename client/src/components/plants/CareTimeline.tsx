import React, { useState, useEffect } from "react";
import { 
  HistoryIcon, 
  WaterDropIcon, 
  SeedlingIcon, 
  SunIcon 
} from "@/lib/icons";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { type CareLog, type PlantWithCare } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";

interface CareTimelineProps {
  plant: PlantWithCare;
}

export function CareTimeline({ plant }: CareTimelineProps) {
  const [careLogs, setCareLogs] = useState<CareLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchCareLogs = async () => {
      try {
        setIsLoading(true);
        const response = await apiRequest('GET', `/api/plants/${plant.id}/care-logs`);
        const logs = await response.json();
        if (Array.isArray(logs)) {
          setCareLogs(logs);
        } else {
          setCareLogs([]);
          console.error('Unexpected response format from care logs API', logs);
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch care logs'));
        console.error('Error fetching care logs:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (plant.id) {
      fetchCareLogs();
    }
  }, [plant.id]);

  const getCareIcon = (careType: string) => {
    switch (careType) {
      case 'water':
        return <WaterDropIcon className="h-4 w-4 text-blue-500" />;
      case 'fertilize':
        return <SeedlingIcon className="h-4 w-4 text-green-500" />;
      case 'repot':
        return <SunIcon className="h-4 w-4 text-amber-500" />;
      case 'prune':
        return <HistoryIcon className="h-4 w-4 text-purple-500" />;
      default:
        return <HistoryIcon className="h-4 w-4 text-neutral-dark" />;
    }
  };

  const getCareTypeColor = (careType: string) => {
    switch (careType) {
      case 'water':
        return 'bg-blue-100 text-blue-800';
      case 'fertilize':
        return 'bg-green-100 text-green-800';
      case 'repot':
        return 'bg-amber-100 text-amber-800';
      case 'prune':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCareType = (careType: string) => {
    return careType.charAt(0).toUpperCase() + careType.slice(1);
  };

  if (isLoading) {
    return (
      <div className="mt-4 space-y-4">
        <div className="flex items-start space-x-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
        <div className="flex items-start space-x-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-md">
        Error loading care history: {error.message}
      </div>
    );
  }

  if (careLogs.length === 0) {
    return (
      <div className="mt-4 p-4 bg-neutral-medium bg-opacity-20 rounded-lg text-center">
        <HistoryIcon className="h-8 w-8 mx-auto mb-2 text-neutral-dark opacity-40" />
        <p className="text-sm text-neutral-dark opacity-70">No care history recorded yet.</p>
        <p className="text-xs mt-1 text-neutral-dark opacity-50">
          Log care activities to build a timeline.
        </p>
      </div>
    );
  }

  // Sort logs by timestamp, newest first
  const sortedLogs = [...careLogs].sort((a, b) => {
    const dateA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
    const dateB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
    return dateB - dateA;
  });

  return (
    <div className="mt-4">
      <div className="space-y-4">
        {sortedLogs.map((log, index) => (
          <div key={log.id} className="relative">
            {/* Timeline connector */}
            {index < sortedLogs.length - 1 && (
              <div className="absolute top-10 bottom-0 left-5 w-0.5 bg-neutral-medium bg-opacity-30"></div>
            )}
            
            <div className="flex items-start space-x-3">
              <div className={`p-2 rounded-full ${getCareTypeColor(log.careType)} flex-shrink-0 z-10`}>
                {getCareIcon(log.careType)}
              </div>
              
              <div className="pt-1">
                <div className="flex items-center">
                  <Badge className={`mr-2 ${getCareTypeColor(log.careType)}`}>
                    {formatCareType(log.careType)}
                  </Badge>
                  <span className="text-xs text-neutral-dark opacity-70">
                    {log.timestamp ? format(new Date(log.timestamp), "MMM d, yyyy 'at' h:mm a") : 'Unknown date'}
                  </span>
                </div>
                
                {log.notes && (
                  <p className="text-sm mt-1 text-neutral-dark">{log.notes}</p>
                )}
                
                {log.photo && (
                  <div 
                    className="mt-2 rounded-md overflow-hidden w-full max-w-[240px] cursor-pointer"
                    onClick={() => {
                      if (log.photo) {
                        window.open(log.photo, '_blank');
                      }
                    }}
                  >
                    <img 
                      src={log.photo} 
                      alt={`Care log ${log.careType} photo`} 
                      className="w-full h-auto object-cover"
                      onError={(e) => {
                        // Replace broken image with fallback content
                        e.currentTarget.style.display = 'none';
                        if (e.currentTarget.parentElement) {
                          e.currentTarget.parentElement.innerHTML = `
                            <div class="bg-neutral-light h-32 flex flex-col items-center justify-center">
                              <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-neutral-dark opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                <polyline points="21 15 16 10 5 21"></polyline>
                              </svg>
                              <p class="text-xs mt-2 text-neutral-dark opacity-70">Image unavailable</p>
                            </div>
                          `;
                        }
                      }}
                    />
                    <div className="text-xs text-center py-1 bg-neutral-medium bg-opacity-30">
                      Click to enlarge
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default CareTimeline;