import { useEffect } from 'react';
import { useRoute } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getQueryFn } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { formatRelativeDate, getDefaultPlantImage } from '@/lib/utils';
import { differenceInDays } from 'date-fns';
import { 
  Droplets,
  Sun,
  Leaf,
  Clock,
  CheckCircle,
  CircleDot,
  Scissors
} from 'lucide-react';
import { type PlantWithCare, type CareLog } from '@shared/schema';

// Interface for API response
interface SharedPlantResponse {
  plant: PlantWithCare;
  careLogs: CareLog[];
  guide?: any;
}

export default function SharedPlantView() {
  const [_, params] = useRoute('/shared/:shareId');
  const shareId = params?.shareId || '';

  const { data, isLoading, error } = useQuery<SharedPlantResponse>({
    queryKey: [`/api/s/${shareId}`],
    queryFn: getQueryFn(),
    retry: 1,
    enabled: !!shareId
  });

  const { toast } = useToast();
  
  useEffect(() => {
    if (error) {
      toast({
        title: 'Error loading shared plant',
        description: 'This plant may no longer be shared or the link is invalid.',
        variant: 'destructive'
      });
    }
  }, [error, toast]);

  // If still loading, show skeleton
  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto p-4 sm:p-6">
        <div className="w-full h-64 bg-muted/50 animate-pulse rounded-lg mb-6"></div>
        <div className="w-3/4 h-8 bg-muted/50 animate-pulse rounded-md mb-4"></div>
        <div className="w-1/2 h-6 bg-muted/50 animate-pulse rounded-md mb-4"></div>
        <div className="w-full h-32 bg-muted/50 animate-pulse rounded-md"></div>
      </div>
    );
  }

  // Handle error state
  if (error || !data) {
    return (
      <div className="max-w-3xl mx-auto p-4 sm:p-6 text-center">
        <h1 className="text-2xl font-bold mb-4">Plant Not Found</h1>
        <p className="text-muted-foreground mb-6">
          This plant may no longer be shared or the link is invalid.
        </p>
        <Button variant="default" onClick={() => window.location.href = '/auth'}>
          Sign Up or Log In
        </Button>
      </div>
    );
  }

  const { plant, careLogs } = data;

  // Calculate water status and remaining days
  const waterRemainingDays = plant.nextWatering 
    ? differenceInDays(new Date(plant.nextWatering), new Date())
    : null;

  // Calculate fertilizer status and remaining days
  const fertilizerRemainingDays = plant.nextFertilizing 
    ? differenceInDays(new Date(plant.nextFertilizing), new Date()) 
    : null;

  // Get sunlight adequacy
  const getSunlightAdequacy = () => {
    const plantGuide = data.guide;
    if (!plantGuide) return "Unknown";

    if (plantGuide.idealSunlight === plant.sunlightLevel) {
      return "Adequate";
    } else {
      return plant.sunlightLevel === "high" 
        ? "Too much" 
        : "Not enough";
    }
  };

  const sunlightStatus = getSunlightAdequacy();
  const sunlightAdequate = sunlightStatus === "Adequate";

  // Format logs for timeline display
  const sortedLogs = [...careLogs].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Function to get the appropriate icon for care type
  const getCareIcon = (careType: string) => {
    switch(careType) {
      case 'water':
        return <Droplets className="h-5 w-5 text-blue-500" />;
      case 'fertilize':
        return <Leaf className="h-5 w-5 text-green-500" />;
      case 'repot':
        return <Leaf className="h-5 w-5 text-amber-500" />;
      case 'prune':
        return <Scissors className="h-5 w-5 text-purple-500" />;
      default:
        return <CircleDot className="h-5 w-5 text-gray-500" />;
    }
  };

  // Function to get the appropriate background color for care type
  const getCareBackgroundClass = (careType: string) => {
    switch(careType) {
      case 'water':
        return 'bg-blue-100 dark:bg-blue-950';
      case 'fertilize':
        return 'bg-green-100 dark:bg-green-950';
      case 'repot':
        return 'bg-amber-100 dark:bg-amber-950';
      case 'prune':
        return 'bg-purple-100 dark:bg-purple-950';
      default:
        return 'bg-gray-100 dark:bg-gray-800';
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6">
      {/* Header and Plant Image */}
      <div className="mb-8">
        <div className="h-64 overflow-hidden rounded-lg relative mb-4">
          <img
            src={plant.image || getDefaultPlantImage(plant.scientificName || plant.type || "")}
            alt={plant.name}
            className="w-full h-full object-cover"
          />
        </div>
        
        <div className="flex justify-between items-start mb-2">
          <div>
            <h1 className="text-2xl font-bold mb-1">{plant.name}</h1>
            {plant.scientificName && (
              <p className="text-neutral-dark dark:text-gray-400 italic">
                {plant.scientificName}
              </p>
            )}
          </div>
          
          <div className="flex flex-col items-end">
            <Badge variant="outline" className="mb-2">Shared Plant View</Badge>
            <Button 
              size="sm" 
              variant="default"
              onClick={() => window.location.href = '/auth'}
              className="whitespace-nowrap"
            >
              Create Your Garden
            </Button>
          </div>
        </div>
        
        <div className="flex mb-3 space-x-2 flex-wrap">
          <Badge variant="outline" className="px-2 py-1 bg-muted/50 dark:bg-muted/20 rounded-full text-xs mb-1">
            {plant.sunlightLevel.charAt(0).toUpperCase() + plant.sunlightLevel.slice(1)} Light
          </Badge>
          <Badge variant="outline" className="px-2 py-1 bg-muted/50 dark:bg-muted/20 rounded-full text-xs mb-1">
            Water every {plant.waterFrequency} days
          </Badge>
          {plant.location && (
            <Badge variant="outline" className="px-2 py-1 bg-muted/50 dark:bg-muted/20 rounded-full text-xs mb-1">
              {plant.location}
            </Badge>
          )}
        </div>
        
        {plant.notes && (
          <div className="mb-6 bg-muted/20 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground whitespace-pre-line break-words">
              {plant.notes}
            </p>
          </div>
        )}
      </div>
      
      {/* Care Info */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Care Schedule</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Water Schedule */}
          <Card className="p-4">
            <div className="flex items-center mb-2">
              <div className="p-2 bg-blue-100 dark:bg-blue-950 rounded-full mr-3">
                <Droplets className="h-5 w-5 text-blue-500" />
              </div>
              <h3 className="font-medium">Water</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-2">Every {plant.waterFrequency} days</p>
            <div className="mt-2">
              <p className="font-medium">
                {waterRemainingDays !== null 
                  ? waterRemainingDays < 0 
                    ? "Overdue" 
                    : waterRemainingDays === 0 
                      ? "Today" 
                      : waterRemainingDays === 1 
                        ? "Tomorrow" 
                        : `In ${waterRemainingDays} days`
                  : "Not set"}
              </p>
            </div>
          </Card>
          
          {/* Sunlight Schedule */}
          <Card className="p-4">
            <div className="flex items-center mb-2">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-950 rounded-full mr-3">
                <Sun className="h-5 w-5 text-yellow-500" />
              </div>
              <h3 className="font-medium">Sunlight</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              {plant.sunlightLevel.charAt(0).toUpperCase() + plant.sunlightLevel.slice(1)}, 
              {plant.sunlightLevel === "high" ? " direct" : " indirect"}
            </p>
            <div className="mt-2">
              <p className={sunlightAdequate ? "text-status-success font-medium" : "text-status-warning font-medium"}>
                {sunlightAdequate ? <CheckCircle className="h-4 w-4 inline mr-1" /> : null}
                {sunlightStatus}
              </p>
            </div>
          </Card>
          
          {/* Fertilizer Schedule */}
          <Card className="p-4">
            <div className="flex items-center mb-2">
              <div className="p-2 bg-green-100 dark:bg-green-950 rounded-full mr-3">
                <Leaf className="h-5 w-5 text-green-500" />
              </div>
              <h3 className="font-medium">Fertilizer</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              {plant.fertilizerFrequency === 0 
                ? "Not needed" 
                : `Every ${plant.fertilizerFrequency} days`}
            </p>
            <div className="mt-2">
              {plant.fertilizerFrequency > 0 && (
                <p className="font-medium">
                  {fertilizerRemainingDays !== null 
                    ? fertilizerRemainingDays < 0 
                      ? "Overdue" 
                      : fertilizerRemainingDays === 0 
                        ? "Today" 
                        : fertilizerRemainingDays === 1 
                          ? "Tomorrow" 
                          : `In ${fertilizerRemainingDays} days`
                    : "Not set"}
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>
      
      {/* Care History */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Care History</h2>
        
        {sortedLogs.length > 0 ? (
          <div className="space-y-4">
            {sortedLogs.map((log) => (
              <div key={log.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center">
                    <div className={`p-2 rounded-full mr-3 ${getCareBackgroundClass(log.careType)}`}>
                      {getCareIcon(log.careType)}
                    </div>
                    <div>
                      <h3 className="font-medium">
                        {log.careType.charAt(0).toUpperCase() + log.careType.slice(1)}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {formatRelativeDate(new Date(log.timestamp))}
                      </p>
                    </div>
                  </div>
                </div>
                
                {log.notes && (
                  <div className="mt-2 bg-muted/20 p-3 rounded">
                    <p className="text-sm text-muted-foreground whitespace-pre-line">
                      {log.notes}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center p-8 bg-muted/20 rounded-lg">
            <p className="text-muted-foreground">No care history available yet.</p>
          </div>
        )}
      </div>

      {/* Footer CTA */}
      <div className="bg-primary/10 dark:bg-primary/5 rounded-lg p-6 text-center mb-8">
        <h3 className="text-lg font-medium mb-2">Like what you see?</h3>
        <p className="text-muted-foreground mb-4">
          Create your own plant care dashboard to track and share your plants with friends.
        </p>
        <Button 
          size="lg" 
          variant="default"
          onClick={() => window.location.href = '/auth'}
        >
          Sign Up for Free
        </Button>
      </div>
    </div>
  );
}