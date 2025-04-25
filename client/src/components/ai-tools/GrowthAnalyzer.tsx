import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Brain, BarChart, Clock, Calendar, ArrowRightLeft, Zap, AlertTriangle, ChevronRight } from "lucide-react";
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
  const [selectedPhotos, setSelectedPhotos] = useState<CareLog[]>([]);
  
  // Query to get user's plants
  const { data: plants, isLoading: isPlantsLoading } = useQuery<PlantWithCare[]>({
    queryKey: ['/api/plants'],
  });
  
  // Query to get care logs with photos for the selected plant
  const { data: careLogs, isLoading: isLogsLoading } = useQuery<CareLog[]>({
    queryKey: ['/api/plants', selectedPlantId, 'care-logs'],
    enabled: !!selectedPlantId,
  });
  
  // Filter care logs with photos
  const careLogsWithPhotos = careLogs?.filter(log => log.photo) || [];
  
  // Toggle photo selection for analysis
  const togglePhotoSelection = (log: CareLog) => {
    if (selectedPhotos.find(p => p.id === log.id)) {
      // Remove if already selected
      setSelectedPhotos(selectedPhotos.filter(p => p.id !== log.id));
    } else {
      // Add if not already selected (max 3)
      if (selectedPhotos.length < 3) {
        // Sort by date to maintain chronological order
        const newSelection = [...selectedPhotos, log].sort((a, b) => {
          const dateA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
          const dateB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
          return dateA - dateB;
        });
        setSelectedPhotos(newSelection);
      } else {
        toast({
          title: "Maximum photos reached",
          description: "Please deselect a photo before selecting another",
          variant: "destructive",
        });
      }
    }
  };
  
  // Extract base64 image data from care log photo
  const getBase64FromPhoto = (photoUrl: string): string => {
    // If it's already a base64 data URL, extract just the base64 part
    if (photoUrl.startsWith('data:image/')) {
      return photoUrl.split(',')[1];
    }
    return photoUrl;
  };
  
  // When plant selection changes, reset selected photos
  const handlePlantChange = (plantId: string) => {
    setSelectedPlantId(plantId);
    setSelectedPhotos([]);
    setAnalysis(null);
  };
  
  // Mutation to get growth analysis
  const analysisMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPlantId || selectedPhotos.length === 0) {
        throw new Error("Please select a plant and at least one photo from care history");
      }
      
      const imageBase64Array = selectedPhotos
        .filter(log => log.photo)
        .map(log => getBase64FromPhoto(log.photo!));
      
      const res = await apiRequest(
        "POST", 
        `/api/ai/growth-analysis/${selectedPlantId}`, 
        { imageBase64Array }
      );
      return res.json();
    },
    onSuccess: (data: GrowthAnalysis) => {
      setAnalysis(data);
      toast({
        title: "Growth analysis completed",
        description: "Your plant growth analysis is ready!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Analysis failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
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
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Unknown date";
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };
  
  const growthInfo = getGrowthRateInfo();
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart className="mr-2 h-5 w-5 text-emerald-500" />
            Growth Analyzer
          </CardTitle>
          <CardDescription>
            Track and analyze your plant's growth over time using photos from your care history
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                <div className="flex justify-between items-center">
                  <Label>Select Photos from Care History</Label>
                  <Badge variant="outline" className="text-xs">
                    {selectedPhotos.length}/3 photos selected
                  </Badge>
                </div>
                
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {careLogsWithPhotos.map((log) => (
                        <div 
                          key={log.id} 
                          className={`border rounded-md overflow-hidden cursor-pointer transition-colors ${
                            selectedPhotos.find(p => p.id === log.id) 
                              ? 'border-emerald-500 ring-2 ring-emerald-500 ring-opacity-50' 
                              : 'hover:border-emerald-200'
                          }`}
                          onClick={() => togglePhotoSelection(log)}
                        >
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
                      ))}
                    </div>
                    
                    {careLogsWithPhotos.length > 0 && (
                      <Alert variant="default" className="bg-blue-50 border-blue-200">
                        <Clock className="h-4 w-4 text-blue-500" />
                        <AlertTitle>Select in Chronological Order</AlertTitle>
                        <AlertDescription className="text-sm">
                          For best results, select 2-3 photos taken at different points in time to analyze growth patterns.
                          Photos will be analyzed in chronological order.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {selectedPhotos.length > 0 && (
              <div className="space-y-3">
                <Label>Selected Photos for Analysis</Label>
                <div className="grid grid-cols-3 gap-4 mt-4">
                  {selectedPhotos.map((log, index) => (
                    <div key={log.id} className="space-y-1">
                      <div className="relative">
                        <div className="h-24 w-full rounded-md overflow-hidden border">
                          <img
                            src={log.photo!}
                            alt={`Selected plant photo ${index + 1}`}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="h-6 w-6 absolute -top-2 -right-2 rounded-full"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPhotos(selectedPhotos.filter(p => p.id !== log.id));
                          }}
                        >
                          <span className="sr-only">Remove selection</span>
                          ✕
                        </Button>
                        <Badge
                          className="absolute bottom-1 right-1 text-xs"
                          variant="secondary"
                        >
                          {index === 0 ? "First" : index === selectedPhotos.length - 1 ? "Latest" : "Middle"}
                        </Badge>
                      </div>
                      <p className="text-xs text-center text-muted-foreground">
                        {formatDate(log.timestamp)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <Button 
              onClick={() => analysisMutation.mutate()} 
              className="w-full"
              disabled={!selectedPlantId || selectedPhotos.length === 0 || analysisMutation.isPending}
            >
              {analysisMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing Growth...
                </>
              ) : (
                <>
                  <BarChart className="mr-2 h-4 w-4" />
                  Analyze Plant Growth
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {analysis && (
        <Card className="border-emerald-200">
          <CardHeader className="bg-emerald-50">
            <CardTitle className="flex items-center">
              <BarChart className="mr-2 h-5 w-5 text-emerald-500" />
              Growth Analysis Results
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
                  <Card className="border-emerald-100">
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
                  
                  <Card className="border-emerald-100">
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
                
                <Card className="border-emerald-100">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Growth Assessment</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{analysis.growthAssessment}</p>
                  </CardContent>
                </Card>
                
                {analysis.potentialIssues.length > 0 && (
                  <Card className="border-amber-200">
                    <CardHeader className="pb-2 bg-amber-50">
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
                  {images.map((image, index) => (
                    <div key={index} className="space-y-2">
                      <div className="rounded-md overflow-hidden border">
                        <img
                          src={`data:image/jpeg;base64,${image}`}
                          alt={`Plant photo ${index + 1}`}
                          className="w-full object-cover"
                        />
                      </div>
                      <p className="text-xs text-center text-muted-foreground">
                        {index === 0 ? "Earlier" : index === images.length - 1 ? "Latest" : "Middle"}
                      </p>
                    </div>
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="recommendations" className="space-y-4">
                <Alert className="bg-emerald-50 border-emerald-200">
                  <AlertTitle className="text-emerald-800">Care Recommendations</AlertTitle>
                  <AlertDescription className="text-emerald-700">
                    Based on the observed growth patterns, here are our recommendations:
                  </AlertDescription>
                </Alert>
                
                <ul className="space-y-3">
                  {analysis.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start">
                      <div className="bg-emerald-100 text-emerald-800 rounded-full w-6 h-6 flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                        {index + 1}
                      </div>
                      <p className="text-sm">{rec}</p>
                    </li>
                  ))}
                </ul>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="bg-emerald-50 flex justify-center border-t border-emerald-100">
            <p className="text-sm text-emerald-700 flex items-center">
              <Brain className="mr-2 h-4 w-4" />
              AI-powered growth analysis powered by OpenAI
            </p>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}