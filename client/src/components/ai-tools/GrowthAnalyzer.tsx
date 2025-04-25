import { useState, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Brain, BarChart, Upload, Camera, ArrowRight, ArrowRightLeft, Zap, AlertTriangle, ChevronRight } from "lucide-react";
import { apiRequest } from '@/lib/queryClient';
import { PlantWithCare } from '@shared/schema';
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
  const [images, setImages] = useState<string[]>([]);
  const [analysis, setAnalysis] = useState<GrowthAnalysis | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Query to get user's plants
  const { data: plants, isLoading: isPlantsLoading } = useQuery<PlantWithCare[]>({
    queryKey: ['/api/plants'],
  });
  
  // Handle file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    // Check if we already have 3 images (maximum)
    if (images.length >= 3) {
      toast({
        title: "Maximum images reached",
        description: "Please remove some images before adding more",
        variant: "destructive",
      });
      return;
    }
    
    // Check file size
    const file = files[0];
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Image too large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        // Store base64 string without the prefix
        const base64Data = result.split(',')[1];
        setImages([...images, base64Data]);
      }
    };
    reader.readAsDataURL(file);
    
    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };
  
  // Remove an image
  const removeImage = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    setImages(newImages);
  };
  
  // Mutation to get growth analysis
  const analysisMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPlantId || images.length === 0) {
        throw new Error("Please select a plant and upload at least one image");
      }
      
      const res = await apiRequest(
        "POST", 
        `/api/ai/growth-analysis/${selectedPlantId}`, 
        { imageBase64Array: images }
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
            Track and analyze your plant's growth over time using AI image analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="plant-select">Select a Plant</Label>
              <Select onValueChange={setSelectedPlantId} value={selectedPlantId}>
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
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label>Upload Growth Photos</Label>
                <Badge variant="outline" className="text-xs">
                  {images.length}/3 images
                </Badge>
              </div>
              
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="relative"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={images.length >= 3}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Image
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={handleFileChange}
                  />
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  disabled={images.length >= 3}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Take Photo
                </Button>
              </div>
              
              {images.length > 0 && (
                <div className="grid grid-cols-3 gap-4 mt-4">
                  {images.map((image, index) => (
                    <div key={index} className="relative">
                      <div className="h-24 w-full rounded-md overflow-hidden border">
                        <img
                          src={`data:image/jpeg;base64,${image}`}
                          alt={`Plant photo ${index + 1}`}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="h-6 w-6 absolute -top-2 -right-2 rounded-full"
                        onClick={() => removeImage(index)}
                      >
                        <span className="sr-only">Remove image</span>
                        ✕
                      </Button>
                      {images.length > 1 && index < images.length - 1 && (
                        <div className="absolute -right-7 top-1/2 transform -translate-y-1/2">
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              {images.length === 0 && (
                <div className="border border-dashed rounded-md p-6 text-center">
                  <p className="text-muted-foreground text-sm">
                    Upload 1-3 photos of your plant taken at different points in time to analyze growth patterns.
                    For best results, use photos from the same angle with good lighting.
                  </p>
                </div>
              )}
            </div>
            
            <Button 
              onClick={() => analysisMutation.mutate()} 
              className="w-full"
              disabled={!selectedPlantId || images.length === 0 || analysisMutation.isPending}
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