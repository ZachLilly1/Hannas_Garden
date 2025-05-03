import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Calendar, Clock, AlertTriangle, Info, Leaf, Droplet, Sun, Thermometer, Brain } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SharedPageLayout } from "@/components/layouts/SharedPageLayout";
import { format } from "date-fns";

export default function SharedCareLogView() {
  const { shareId } = useParams();
  const [notFound, setNotFound] = useState(false);

  // Define the interface for our data types
  interface CareLog {
    id: number;
    plantId: number;
    careType: string;
    timestamp: string;
    notes?: string;
    metadata?: {
      photos?: string[];
      journalEntry?: {
        title: string;
        observations: string[];
        growthProgress: string;
      };
      healthData?: {
        concerns: string[];
        recommendations: string;
      };
    };
  }

  interface Plant {
    id: number;
    name: string;
    scientificName?: string;
    image?: string;
    location?: string;
    type?: string;
    sunlightLevel?: string;
  }

  const { data, error, isLoading } = useQuery<{careLog: CareLog; plant: Plant}>({
    queryKey: [`/api/sc/${shareId}`]
  });
  
  // Set not found if there's an error
  React.useEffect(() => {
    if (error) {
      setNotFound(true);
    }
  }, [error]);

  if (notFound || error) {
    return (
      <SharedPageLayout>
        <div className="container max-w-5xl mx-auto py-12">
          <Alert variant="destructive" className="mb-8">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Not Found</AlertTitle>
            <AlertDescription>
              The shared care log you're looking for doesn't exist or has been removed.
            </AlertDescription>
          </Alert>
          <div className="text-center">
            <h1 className="text-2xl font-semibold mb-4">Looking for a better way to track your plants' care?</h1>
            <p className="mb-6 text-muted-foreground">
              Sign up for PlantPal and get a complete plant care tracking and reminder system!
            </p>
            <Button asChild size="lg">
              <Link href="/auth">Create an Account</Link>
            </Button>
          </div>
        </div>
      </SharedPageLayout>
    );
  }

  if (isLoading || !data) {
    return (
      <SharedPageLayout>
        <div className="container max-w-5xl mx-auto py-12">
          <div className="space-y-6">
            <Skeleton className="h-12 w-1/2" />
            <Skeleton className="h-8 w-1/3" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Skeleton className="h-64" />
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          </div>
        </div>
      </SharedPageLayout>
    );
  }

  const { careLog, plant } = data;
  const careDate = new Date(careLog.timestamp);

  // Format the care type for display
  const formatCareType = (type: string) => {
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  // Get icon for care type
  const getCareTypeIcon = (careType: string) => {
    switch (careType) {
      case 'water':
        return <Droplet className="h-5 w-5" />;
      case 'fertilize':
        return <Leaf className="h-5 w-5" />;
      case 'repot':
        return <Thermometer className="h-5 w-5" />;
      case 'prune':
        return <Leaf className="h-5 w-5" />;
      case 'health_check':
        return <Info className="h-5 w-5" />;
      default:
        return <Info className="h-5 w-5" />;
    }
  };

  return (
    <SharedPageLayout>
      <div className="container max-w-5xl mx-auto py-8 px-4">
        <div className="mb-8">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/auth">
              ← Go to PlantPal
            </Link>
          </Button>
          <h1 className="text-3xl font-bold mt-6">{plant.name} Care Log</h1>
          <div className="flex items-center mt-2 text-muted-foreground">
            <Calendar className="h-4 w-4 mr-1" />
            <span>{format(careDate, 'MMMM d, yyyy')}</span>
            <span className="mx-2">•</span>
            <Clock className="h-4 w-4 mr-1" />
            <span>{format(careDate, 'h:mm a')}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Plant Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {plant.image && (
                    <div className="relative h-48 md:h-64 w-full rounded-md overflow-hidden">
                      <img
                        src={plant.image}
                        alt={plant.name}
                        className="object-cover w-full h-full"
                      />
                    </div>
                  )}
                  <div>
                    <h3 className="font-medium">Name</h3>
                    <p>{plant.name}</p>
                  </div>
                  {plant.scientificName && (
                    <div>
                      <h3 className="font-medium">Scientific Name</h3>
                      <p className="italic">{plant.scientificName}</p>
                    </div>
                  )}
                  {plant.type && (
                    <div>
                      <h3 className="font-medium">Type</h3>
                      <p>{plant.type}</p>
                    </div>
                  )}
                  {plant.location && (
                    <div>
                      <h3 className="font-medium">Location</h3>
                      <p>{plant.location}</p>
                    </div>
                  )}
                  <div>
                    <h3 className="font-medium">Sunlight Needs</h3>
                    <div className="flex items-center gap-1 mt-1">
                      <Sun className="h-4 w-4 text-yellow-500" />
                      <span className="capitalize">{plant.sunlightLevel || "Medium"}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center gap-2">
                    {getCareTypeIcon(careLog.careType)}
                    <span>{formatCareType(careLog.careType)}</span>
                  </CardTitle>
                  <Badge variant="outline">{format(careDate, 'PP')}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {careLog.notes && (
                  <div className="mb-4">
                    <h3 className="font-medium mb-1">Notes</h3>
                    <p className="text-muted-foreground whitespace-pre-wrap">{careLog.notes}</p>
                  </div>
                )}

                {careLog.metadata && careLog.metadata.photos && careLog.metadata.photos.length > 0 && (
                  <div className="mt-4">
                    <h3 className="font-medium mb-2">Photos</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {careLog.metadata.photos.map((photo: string, index: number) => (
                        <div key={index} className="relative h-40 rounded-md overflow-hidden">
                          <img
                            src={photo}
                            alt={`Care log photo ${index + 1}`}
                            className="object-cover w-full h-full"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {careLog.metadata && careLog.metadata.journalEntry && (
                  <div className="mt-6">
                    <Separator className="my-4" />
                    <div className="mt-3">
                      <div className="flex items-center">
                        <Brain className="h-3 w-3 mr-2 text-indigo-500" />
                        <span className="text-sm font-medium">AI Analysis</span>
                      </div>
                      
                      <Card className="mt-2 border-indigo-100">
                        <CardContent className="p-3">
                          <h4 className="text-sm font-medium mb-2">{careLog.metadata.journalEntry.title}</h4>
                          
                          <Tabs defaultValue="observations" className="w-full">
                            <TabsList className="w-full mb-2 h-8">
                              <TabsTrigger value="observations" className="text-xs">Observations</TabsTrigger>
                              <TabsTrigger value="growth" className="text-xs">Growth Progress</TabsTrigger>
                            </TabsList>
                            
                            <TabsContent value="observations">
                              <ul className="text-xs space-y-1 pl-5 list-disc">
                                {careLog.metadata.journalEntry.observations.map((obs: string, idx: number) => (
                                  <li key={idx}>{obs}</li>
                                ))}
                              </ul>
                            </TabsContent>
                            
                            <TabsContent value="growth">
                              <p className="text-xs whitespace-pre-line">
                                {careLog.metadata.journalEntry.growthProgress}
                              </p>
                            </TabsContent>
                          </Tabs>
                          
                          <div className="mt-2 pt-2 border-t border-indigo-50 flex justify-end">
                            <span className="text-xs text-indigo-400 flex items-center">
                              <Brain className="h-3 w-3 mr-1" />
                              AI-powered analysis
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}

                {careLog.metadata && careLog.metadata.healthData && (
                  <div className="mt-6">
                    <Separator className="my-4" />
                    <h3 className="font-semibold text-lg mb-2">Health Check Results</h3>
                    <div className="space-y-4">
                      {careLog.metadata.healthData.concerns && careLog.metadata.healthData.concerns.length > 0 && (
                        <div>
                          <h4 className="font-medium">Identified Concerns</h4>
                          <ul className="list-disc list-inside mt-1 space-y-1">
                            {careLog.metadata.healthData.concerns.map((concern: string, i: number) => (
                              <li key={i} className="text-muted-foreground">{concern}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {careLog.metadata.healthData.recommendations && (
                        <div>
                          <h4 className="font-medium">Recommendations</h4>
                          <p className="text-muted-foreground whitespace-pre-wrap mt-1">
                            {careLog.metadata.healthData.recommendations}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex flex-col items-start">
                <div className="mt-2 w-full">
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Want to track your own plants?</AlertTitle>
                    <AlertDescription>
                      Create a free PlantPal account to track your plants' care, get reminders, and more!
                    </AlertDescription>
                    <div className="mt-2">
                      <Button asChild>
                        <Link href="/auth">Sign Up</Link>
                      </Button>
                    </div>
                  </Alert>
                </div>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </SharedPageLayout>
  );
}