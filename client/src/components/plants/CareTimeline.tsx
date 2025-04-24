import React, { useState, useEffect } from "react";
import { 
  HistoryIcon, 
  WaterDropIcon, 
  SeedlingIcon, 
  SunIcon,
  LeafIcon,
  ActivityIcon,
  AlertIcon
} from "@/lib/icons";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { type CareLog, type PlantWithCare } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { PlantHealthDiagnosis } from "@/types/plant-health";

// Define severity and confidence levels for use in the component
type SeverityLevel = 'high' | 'medium' | 'low';
type ConfidenceLevel = 'high' | 'medium' | 'low';

interface CareLogMetadata {
  healthDiagnosis?: PlantHealthDiagnosis;
  // Add other metadata properties as needed in the future
}

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

  const getCareIcon = (careType: string, healthSeverity?: SeverityLevel) => {
    switch (careType) {
      case 'water':
        return <WaterDropIcon className="h-4 w-4 text-blue-500" />;
      case 'fertilize':
        return <SeedlingIcon className="h-4 w-4 text-green-500" />;
      case 'repot':
        return <SunIcon className="h-4 w-4 text-amber-500" />;
      case 'prune':
        return <HistoryIcon className="h-4 w-4 text-purple-500" />;
      case 'health_check':
        if (healthSeverity === 'high') {
          return <AlertIcon className="h-4 w-4 text-red-500" />;
        } else if (healthSeverity === 'medium') {
          return <ActivityIcon className="h-4 w-4 text-amber-500" />;
        } else {
          return <LeafIcon className="h-4 w-4 text-blue-500" />;
        }
      default:
        return <HistoryIcon className="h-4 w-4 text-neutral-dark" />;
    }
  };

  const getCareTypeColor = (careType: string, healthSeverity?: SeverityLevel) => {
    switch (careType) {
      case 'water':
        return 'bg-blue-100 text-blue-800';
      case 'fertilize':
        return 'bg-green-100 text-green-800';
      case 'repot':
        return 'bg-amber-100 text-amber-800';
      case 'prune':
        return 'bg-purple-100 text-purple-800';
      case 'health_check':
        if (healthSeverity === 'high') {
          return 'bg-red-100 text-red-800';
        } else if (healthSeverity === 'medium') {
          return 'bg-amber-100 text-amber-800';
        } else {
          return 'bg-blue-100 text-blue-800';
        }
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCareType = (careType: string) => {
    // Handle special case for health_check
    if (careType === 'health_check') {
      return 'Health Check';
    }
    
    // Handle other care types with simple capitalization
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
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium flex items-center gap-1">
          <HistoryIcon className="h-4 w-4 text-neutral-dark" />
          <span>Care History</span>
          <span className="ml-1.5 px-1.5 py-0.5 bg-primary bg-opacity-10 text-primary rounded-full text-xs">
            {careLogs.length}
          </span>
        </h3>
      </div>
      <div className="space-y-4">
        {sortedLogs.map((log, index) => (
          <div key={log.id} className="relative">
            {/* Timeline connector */}
            {index < sortedLogs.length - 1 && (
              <div className="absolute top-10 bottom-0 left-5 w-0.5 bg-neutral-medium bg-opacity-30"></div>
            )}
            
            <div className="flex items-start space-x-3">
              {/* Get health severity if this is a health check log */}
              {(() => {
                let healthSeverity: SeverityLevel | undefined = undefined;
                if (log.careType === 'health_check' && log.metadata) {
                  try {
                    const metadata: CareLogMetadata = typeof log.metadata === 'string' 
                      ? JSON.parse(log.metadata) 
                      : log.metadata;
                    
                    if (metadata.healthDiagnosis) {
                      healthSeverity = metadata.healthDiagnosis.severity;
                    }
                  } catch (e) {
                    console.error('Failed to parse health metadata:', e);
                  }
                }
                
                return (
                  <div className={`p-2 rounded-full ${getCareTypeColor(log.careType, healthSeverity)} flex-shrink-0 z-10`}>
                    {getCareIcon(log.careType, healthSeverity)}
                  </div>
                );
              })()}
              
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
                
                {/* Display health diagnosis information if available */}
                {log.careType === 'health_check' && log.metadata && (() => {
                  try {
                    const metadata: CareLogMetadata = typeof log.metadata === 'string' 
                      ? JSON.parse(log.metadata) 
                      : log.metadata;
                    
                    if (metadata.healthDiagnosis) {
                      const diagnosis: PlantHealthDiagnosis = metadata.healthDiagnosis;
                      
                      // Determine colors based on severity
                      type ColorSet = {
                        border: string;
                        bg: string;
                        text: string;
                        badge: string;
                        dot: string;
                      };
                      
                      const severityColors: Record<SeverityLevel, ColorSet> = {
                        high: {
                          border: 'border-red-300',
                          bg: 'bg-red-50',
                          text: 'text-red-800',
                          badge: 'bg-red-500 text-white',
                          dot: 'bg-red-500'
                        },
                        medium: {
                          border: 'border-amber-300',
                          bg: 'bg-amber-50', 
                          text: 'text-amber-800',
                          badge: 'bg-amber-500 text-white',
                          dot: 'bg-amber-500'
                        },
                        low: {
                          border: 'border-blue-300',
                          bg: 'bg-blue-50',
                          text: 'text-blue-800',
                          badge: 'bg-blue-500 text-white',
                          dot: 'bg-blue-500'
                        }
                      };
                      
                      // Get the severity or default to 'low'
                      const severityKey: SeverityLevel = diagnosis.severity && ['low', 'medium', 'high'].includes(diagnosis.severity) 
                        ? diagnosis.severity as SeverityLevel
                        : 'low';
                      const colors = severityColors[severityKey];
                      
                      return (
                        <div className={`mt-2 p-3 rounded-lg text-sm border ${colors.border} ${colors.bg}`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-medium text-base flex items-center">
                              <AlertIcon className="w-4 h-4 mr-1.5" />
                              {diagnosis.issue}
                            </div>
                            <Badge className={`${colors.badge} text-xs`}>
                              {diagnosis.severity && typeof diagnosis.severity === 'string' 
                                ? diagnosis.severity.charAt(0).toUpperCase() + diagnosis.severity.slice(1) 
                                : 'Medium'} Severity
                            </Badge>
                          </div>
                          
                          <div className="space-y-2">
                            <div className={`${colors.text}`}>
                              <strong className="font-medium">Cause:</strong> 
                              <p className="text-xs mt-0.5">{diagnosis.cause}</p>
                            </div>
                            
                            <div className={`${colors.text}`}>
                              <strong className="font-medium">Solution:</strong> 
                              <p className="text-xs mt-0.5">{diagnosis.solution}</p>
                            </div>
                            
                            {diagnosis.preventionTips && Array.isArray(diagnosis.preventionTips) && diagnosis.preventionTips.length > 0 && (
                              <div className={`${colors.text}`}>
                                <strong className="font-medium">Prevention Tips:</strong>
                                <ul className="list-disc pl-5 text-xs mt-0.5 space-y-0.5">
                                  {diagnosis.preventionTips.map((tip, i) => (
                                    <li key={i}>{tip}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            <div className="flex items-center justify-between text-xs pt-1">
                              <div className="flex items-center">
                                <span className={`inline-block w-2 h-2 rounded-full ${colors.dot} mr-1.5`}></span>
                                <span className={colors.text}>
                                  Confidence: {diagnosis.confidenceLevel && typeof diagnosis.confidenceLevel === 'string'
                                    ? diagnosis.confidenceLevel.charAt(0).toUpperCase() + diagnosis.confidenceLevel.slice(1)
                                    : 'Medium'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }
                  } catch (e) {
                    console.error('Failed to parse health diagnosis:', e);
                  }
                  return null;
                })()}
                
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