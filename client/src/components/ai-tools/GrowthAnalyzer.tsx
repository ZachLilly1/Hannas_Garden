import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Brain, BarChart, Clock, Calendar, ArrowRightLeft, Zap, AlertTriangle, ChevronRight, ImagePlus } from "lucide-react";
import { apiRequest } from '@/lib/queryClient';
import { PlantWithCare, CareLog } from '@shared/schema';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";

// Interface for the OpenAI response
interface GrowthAnalysis {
  growthAssessment: string;
  healthChanges: string;
  growthRate: "slow" | "moderate" | "fast";
  potentialIssues: string[];
  recommendations: string[];
  comparisonNotes: string;
}

export function GrowthAnalyzer() {
  const { toast } = useToast();
  const [selectedPlantId, setSelectedPlantId] = useState<string>("");
  const [analysis, setAnalysis] = useState<GrowthAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  
  // Query to get user's plants
  const { data: plants, isLoading: isPlantsLoading } = useQuery<PlantWithCare[]>({
    queryKey: ['/api/plants'],
  });
  
  // Query to get care logs with photos for the selected plant
  const { data: careLogs, isLoading: isLogsLoading } = useQuery<CareLog[]>({
    queryKey: ['/api/plants', selectedPlantId, 'care-logs'],
    queryFn: async () => {
      const response = await fetch(`/api/plants/${selectedPlantId}/care-logs`);
      if (!response.ok) {
        throw new Error('Failed to fetch care logs');
      }
      return response.json();
    },
    enabled: !!selectedPlantId,
  });
  
  // Filter and sort care logs with photos by timestamp
  const careLogsWithPhotos = careLogs?.filter(log => log.photo)
    .sort((a, b) => {
      const dateA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const dateB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return dateA - dateB;
    }) || [];
  
  // Compress base64 image data
  const compressImage = (base64: string, maxWidth = 800, quality = 0.7): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        
        // Calculate new dimensions while maintaining aspect ratio
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Convert to compressed JPEG
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedBase64);
      };
      
      // If image fails to load, return original
      img.onerror = () => resolve(base64);
    });
  };
  
  // Extract base64 image data from care log photo
  const getBase64FromPhoto = (photoUrl: string): string => {
    // For now, just return the original image
    // We'll modify the runAnalysis function to handle the compression
    return photoUrl;
  };
  
  // When plant selection changes, reset analysis
  const handlePlantChange = (plantId: string) => {
    setSelectedPlantId(plantId);
    setAnalysis(null);
  };
  
  // Automatically run analysis when plant is selected and photos are available
  useEffect(() => {
    // Wait for logs to load and then check if we have photos
    if (!isLogsLoading && selectedPlantId && careLogsWithPhotos.length > 0 && !analysis && !analyzing) {
      runAnalysis();
    }
  }, [isLogsLoading, selectedPlantId, careLogsWithPhotos.length]);
  
  // Function to run the analysis
  const runAnalysis = async () => {
    if (!selectedPlantId || careLogsWithPhotos.length === 0) {
      toast({
        title: "Cannot analyze",
        description: "Please select a plant with care photos",
        variant: "destructive",
      });
      return;
    }
    
    setAnalyzing(true);
    
    try {
      // Use all photos for analysis
      const photosToAnalyze = careLogsWithPhotos;
      
      // Step 1: Get all photos
      const originalPhotos = photosToAnalyze
        .filter(log => log.photo)
        .map(log => log.photo!);
      
      // For debugging
      console.log(`Found ${originalPhotos.length} photos for analysis`);
      
      // Step 2: Compress all photos (with progress indication)
      const totalPhotos = originalPhotos.length;
      toast({
        title: "Preparing images",
        description: `Compressing ${totalPhotos} photos for analysis...`,
      });
      
      // Step 3: Process images in batches for better performance
      const compressedPhotos = [];
      for (let i = 0; i < originalPhotos.length; i++) {
        try {
          // Add small delay to prevent UI blocking
          if (i > 0 && i % 3 === 0) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          
          const compressed = await compressImage(originalPhotos[i], 800, 0.6);
          compressedPhotos.push(compressed);
          
          // Update progress for user
          if (i > 0 && i % 3 === 0 || i === originalPhotos.length - 1) {
            toast({
              title: "Preparing images",
              description: `Processed ${i+1} of ${totalPhotos} photos...`,
            });
          }
        } catch (err) {
          console.error("Error compressing image:", err);
          // If compression fails, use original
          compressedPhotos.push(originalPhotos[i]);
        }
      }
      
      // Fallback analysis if the API fails (for error reporting only, not synthetic data)
      const fallbackErrorMessage = {
        growthAssessment: "Unable to analyze growth patterns from the provided images.",
        healthChanges: "Image analysis unavailable. Please check your images or try again later.",
        growthRate: "moderate",
        potentialIssues: ["Unable to perform automated analysis"],
        recommendations: [
          "Try uploading clearer images of your plant",
          "Ensure photos are taken from similar angles",
          "Ensure photos have good lighting"
        ],
        comparisonNotes: "The automated analysis service is currently unavailable. Please try again later or contact support if the issue persists."
      };
      
      // Try to use the API, but fall back to demo data if needed
      let data;
      
      try {
        toast({
          title: "Analyzing growth",
          description: "Sending compressed images to our AI service...",
        });
        
        // Try to get analysis from server
        const res = await apiRequest(
          "POST", 
          `/api/ai/growth-analysis/${selectedPlantId}`, 
          { imageHistory: compressedPhotos }
        );
        
        data = await res.json();
        
        // Show success toast only on successful API response
        toast({
          title: "Growth analysis completed",
          description: "Your plant growth analysis is ready!",
        });
      } catch (error) {
        console.error("Error from growth analysis API", error);
        // Use error message when API fails
        data = fallbackErrorMessage;
        
        toast({
          title: "Analysis service issue",
          description: "We encountered a problem analyzing your plant photos. Please try again later or contact support.",
          variant: "destructive",
        });
      }
      
      setAnalysis(data);
    } catch (error: any) {
      console.error("Overall error in runAnalysis:", error);
      toast({
        title: "Analysis failed",
        description: error.message || "An error occurred during analysis",
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
    }
  };
  
  // Get growth rate color and percentage
  const getGrowthRateInfo = () => {
    if (!analysis) return { color: "", percent: 0, label: "" };
    
    switch (analysis.growthRate) {
      case "slow":
        return { color: "bg-blue-500", percent: 33, label: "Slow" };
      case "moderate":
        return { color: "bg-green-500", percent: 67, label: "Moderate" };
      case "fast":
        return { color: "bg-orange-500", percent: 100, label: "Fast" };
      default:
        return { color: "", percent: 0, label: "" };
    }
  };
  
  // Format date for display
  const formatDate = (dateString: string | Date | null) => {
    if (!dateString) return "Unknown date";
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };
  
  const growthInfo = getGrowthRateInfo();
  
  // Get photos to display in the analysis (up to 3 most recent ones)
  const photosForDisplay = careLogsWithPhotos.slice(-3);
  
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="plant-select">Select a Plant</Label>
              <Select onValueChange={handlePlantChange} value={selectedPlantId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a plant to analyze" />
                </SelectTrigger>
                <SelectContent>
                  {isPlantsLoading ? (
                    <div className="flex justify-center p-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                  ) : plants && plants.length > 0 ? (
                    plants.map((plant) => (
                      <SelectItem key={plant.id} value={plant.id.toString()}>
                        {plant.name}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-2 text-center text-sm text-muted-foreground">
                      No plants found. Add plants to your collection first.
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
            
            {selectedPlantId && (
              <div className="space-y-3">
                {isLogsLoading ? (
                  <div className="flex justify-center p-4">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : careLogsWithPhotos.length === 0 ? (
                  <Alert>
                    <AlertTitle>No photos available</AlertTitle>
                    <AlertDescription>
                      This plant doesn't have any care logs with photos. Add some care logs with photos first.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-4 flex items-start">
                      <ImagePlus className="h-5 w-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
                      <div>
                        <h4 className="text-sm font-medium text-blue-800">Photos Found</h4>
                        <p className="text-sm text-blue-700 mt-1">
                          {careLogsWithPhotos.length} photo{careLogsWithPhotos.length !== 1 ? 's' : ''} found in your care logs.
                          All photos will be analyzed for growth patterns.
                          {careLogsWithPhotos.length > 3 ? 
                            ' The most recent 3 photos are displayed below for reference.' : 
                            ''}
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {photosForDisplay.map((log, index) => (
                        <div key={log.id} className="space-y-1">
                          <div className="border rounded-md overflow-hidden">
                            <div className="aspect-square overflow-hidden">
                              <img
                                src={log.photo!}
                                alt={`Plant care log from ${formatDate(log.timestamp)}`}
                                className="h-full w-full object-cover"
                              />
                            </div>
                            <div className="p-2 bg-gray-50 flex items-center justify-between text-xs">
                              <div className="flex items-center text-muted-foreground">
                                <Calendar className="h-3 w-3 mr-1" />
                                {formatDate(log.timestamp)}
                              </div>
                              <Badge variant="outline" className="capitalize text-xs">
                                {log.careType.replace('_', ' ')}
                              </Badge>
                            </div>
                          </div>
                          <Badge
                            className="mx-auto flex mt-2 justify-center"
                            variant="secondary"
                          >
                            {index === 0 && photosForDisplay.length > 1 ? "Earliest" : 
                             index === photosForDisplay.length - 1 && photosForDisplay.length > 1 ? "Latest" : 
                             "Photo " + (index + 1)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                    
                    {analyzing && (
                      <div className="mt-4">
                        <Alert variant="default" className="bg-emerald-50 border-emerald-200">
                          <Loader2 className="h-4 w-4 text-emerald-500 animate-spin" />
                          <AlertTitle>Analyzing Growth</AlertTitle>
                          <AlertDescription className="text-sm">
                            AI is analyzing your plant's growth patterns. This may take a moment...
                          </AlertDescription>
                        </Alert>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {analysis && (
        <Card className="border-emerald-200 dark:border-emerald-900">
          <CardHeader className="bg-emerald-50 dark:bg-emerald-950">
            <CardTitle className="flex items-center text-base font-medium">
              <BarChart className="mr-2 h-5 w-5 text-emerald-500" />
              Analysis Results
            </CardTitle>
            <CardDescription>
              AI-powered analysis of your plant's growth patterns
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="w-full justify-start mb-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="details">Growth Details</TabsTrigger>
                <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <Card className="border-emerald-100 dark:border-emerald-800">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center">
                        <Zap className="h-4 w-4 mr-2 text-emerald-500" />
                        Growth Rate
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span>Slow</span>
                          <span>Moderate</span>
                          <span>Fast</span>
                        </div>
                        <Progress value={growthInfo.percent} className="h-2" />
                        <div className="flex justify-end">
                          <Badge variant="secondary" className="mt-2">
                            {growthInfo.label}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="border-emerald-100 dark:border-emerald-800">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center">
                        <ArrowRightLeft className="h-4 w-4 mr-2 text-emerald-500" />
                        Health Changes
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{analysis.healthChanges}</p>
                    </CardContent>
                  </Card>
                </div>
                
                <Card className="border-emerald-100 dark:border-emerald-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center">
                      <Brain className="h-4 w-4 mr-2 text-emerald-500" />
                      Growth Assessment
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{analysis.growthAssessment}</p>
                  </CardContent>
                </Card>
                
                {analysis.potentialIssues.length > 0 && (
                  <Card className="border-amber-200 dark:border-amber-800">
                    <CardHeader className="pb-2 bg-amber-50 dark:bg-amber-950">
                      <CardTitle className="text-base flex items-center">
                        <AlertTriangle className="h-4 w-4 mr-2 text-amber-500" />
                        Potential Issues
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="list-disc pl-5 space-y-1">
                        {analysis.potentialIssues.map((issue, index) => (
                          <li key={index} className="text-sm">{issue}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
              
              <TabsContent value="details" className="space-y-4">
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="comparison">
                    <AccordionTrigger>
                      <div className="flex items-center">
                        <span className="text-base font-medium">Comparison Analysis</span>
                        <ChevronRight className="h-4 w-4 ml-2 text-muted-foreground" />
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <p className="text-sm whitespace-pre-line">{analysis.comparisonNotes}</p>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
                
                <div className="grid grid-cols-3 gap-4 mt-4">
                  {photosForDisplay.map((log, index) => (
                    <div key={log.id} className="space-y-2">
                      <div className="rounded-md overflow-hidden border">
                        <img
                          src={log.photo!}
                          alt={`Plant photo ${index + 1}`}
                          className="w-full object-cover"
                        />
                      </div>
                      <p className="text-xs text-center text-muted-foreground">
                        {index === 0 ? "Earlier" : index === photosForDisplay.length - 1 ? "Latest" : "Middle"}
                      </p>
                    </div>
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="recommendations" className="space-y-4">
                <Alert className="bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800">
                  <AlertTitle className="text-emerald-800 dark:text-emerald-200">Care Recommendations</AlertTitle>
                  <AlertDescription className="text-emerald-700 dark:text-emerald-300">
                    Based on the observed growth patterns, here are our recommendations:
                  </AlertDescription>
                </Alert>
                
                <ul className="space-y-3">
                  {analysis.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start">
                      <div className="bg-emerald-100 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-full w-6 h-6 flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                        {index + 1}
                      </div>
                      <p className="text-sm">{rec}</p>
                    </li>
                  ))}
                </ul>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="bg-emerald-50 dark:bg-emerald-950 flex justify-center border-t border-emerald-100 dark:border-emerald-800">
            <p className="text-sm text-emerald-700 dark:text-emerald-300 flex items-center">
              <Brain className="mr-2 h-4 w-4" />
              AI-powered growth analysis powered by OpenAI
            </p>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}