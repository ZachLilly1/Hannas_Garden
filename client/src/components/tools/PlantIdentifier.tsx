import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Camera, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { PlantWithCare } from "@shared/schema";

// Types for plant identification result from OpenAI
interface PlantIdentificationResult {
  plantType: string;
  commonName: string;
  scientificName: string;
  careRecommendations: {
    waterFrequency: number;
    sunlightLevel: "low" | "medium" | "high";
    fertilizerFrequency: number;
    additionalCare: string;
  };
  confidence: "high" | "medium" | "low";
}

export function PlantIdentifier({ onAddToCollection }: { 
  onAddToCollection?: (plant: Partial<PlantWithCare>) => void 
}) {
  const [image, setImage] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Clear the selected image
  const clearImage = () => {
    setImage(null);
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Handle image file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({
          title: "File too large",
          description: "Please select an image smaller than 10MB",
          variant: "destructive",
        });
        return;
      }
      
      const reader = new FileReader();
      
      reader.onloadend = () => {
        const base64String = reader.result as string;
        // Extract the base64 data part (remove the data:image/jpeg;base64, prefix)
        const base64Data = base64String.split(',')[1];
        setImage(base64Data);
        setPreview(base64String);
      };
      
      reader.readAsDataURL(file);
    }
  };

  // Handle camera capture on mobile
  const handleCameraCapture = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Handle upload button click
  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Mutation for identifying plants
  const identifyMutation = useMutation({
    mutationFn: async (imageBase64: string) => {
      const res = await apiRequest('POST', '/api/identify-plant', { imageBase64 });
      const data: PlantIdentificationResult = await res.json();
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Plant identified!",
        description: `This appears to be a ${data.commonName} (${data.scientificName})`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Identification failed",
        description: error.message || "Please try again with a clearer image",
        variant: "destructive",
      });
    },
  });

  // Add the identified plant to the user's collection
  const handleAddToCollection = () => {
    if (!identifyMutation.data) return;
    
    const { commonName, scientificName, careRecommendations } = identifyMutation.data;
    
    const newPlant = {
      name: commonName,
      scientificName: scientificName,
      type: identifyMutation.data.plantType,
      waterFrequency: careRecommendations.waterFrequency,
      fertilizerFrequency: careRecommendations.fertilizerFrequency,
      sunlightLevel: careRecommendations.sunlightLevel,
      notes: careRecommendations.additionalCare,
      image: preview, // Use the preview image for the plant
    };
    
    if (onAddToCollection) {
      onAddToCollection(newPlant);
    }
  };

  // Identify the plant from the image
  const identifyPlant = () => {
    if (!image) {
      toast({
        title: "No image selected",
        description: "Please take or upload a photo of a plant first",
        variant: "destructive",
      });
      return;
    }
    
    identifyMutation.mutate(image);
  };

  // Helper function to get badge color based on confidence
  const getConfidenceColor = (confidence: "high" | "medium" | "low") => {
    switch (confidence) {
      case "high": return "bg-green-100 text-green-800";
      case "medium": return "bg-yellow-100 text-yellow-800";
      case "low": return "bg-red-100 text-red-800";
      default: return "";
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-xl md:text-2xl font-bold">Plant Identifier</CardTitle>
          <CardDescription>
            Take or upload a photo of a plant to identify it and get care recommendations
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            capture="environment"
          />
          
          {/* Image preview area */}
          <div className="relative aspect-video w-full bg-zinc-100 dark:bg-zinc-800 rounded-lg overflow-hidden flex items-center justify-center">
            {preview ? (
              <>
                <img
                  src={preview}
                  alt="Plant preview"
                  className="h-full w-full object-contain"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8 rounded-full"
                  onClick={clearImage}
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <div className="text-center p-8">
                <div className="mx-auto h-12 w-12 text-muted-foreground mb-2">
                  <Camera className="h-12 w-12" />
                </div>
                <p className="text-muted-foreground">
                  No image selected
                </p>
              </div>
            )}
          </div>
          
          {/* Camera/Upload buttons */}
          <div className="flex gap-3 mt-4">
            <Button 
              variant="outline" 
              className="flex-1" 
              onClick={handleCameraCapture}
            >
              <Camera className="mr-2 h-4 w-4" />
              Take Photo
            </Button>
            <Button 
              variant="outline" 
              className="flex-1" 
              onClick={handleUploadClick}
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload Image
            </Button>
          </div>
          
          {/* Identification button */}
          <Button 
            className="w-full mt-4"
            onClick={identifyPlant}
            disabled={!image || identifyMutation.isPending}
          >
            {identifyMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Identifying...
              </>
            ) : "Identify Plant"}
          </Button>
          
          {/* Identification results */}
          {identifyMutation.data && (
            <div className="mt-6 rounded-lg border p-4 bg-background">
              <div className="flex flex-col md:flex-row justify-between gap-4 items-start">
                <div>
                  <h3 className="text-lg font-semibold">{identifyMutation.data.commonName}</h3>
                  <p className="text-sm text-muted-foreground italic">{identifyMutation.data.scientificName}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={getConfidenceColor(identifyMutation.data.confidence)}>
                    {identifyMutation.data.confidence.charAt(0).toUpperCase() + identifyMutation.data.confidence.slice(1)} confidence
                  </Badge>
                  <Badge variant="outline">
                    {identifyMutation.data.plantType.charAt(0).toUpperCase() + identifyMutation.data.plantType.slice(1)}
                  </Badge>
                </div>
              </div>
              
              <Separator className="my-4" />
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <Label className="text-sm font-medium">Water Frequency</Label>
                  <p className="mt-1">{identifyMutation.data.careRecommendations.waterFrequency} days</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Sunlight Needs</Label>
                  <p className="mt-1 capitalize">{identifyMutation.data.careRecommendations.sunlightLevel}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Fertilize Frequency</Label>
                  <p className="mt-1">{identifyMutation.data.careRecommendations.fertilizerFrequency} days</p>
                </div>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Care Instructions</Label>
                <p className="mt-1 text-sm whitespace-pre-line">{identifyMutation.data.careRecommendations.additionalCare}</p>
              </div>
            </div>
          )}
        </CardContent>
        
        {identifyMutation.data && onAddToCollection && (
          <CardFooter>
            <Button 
              onClick={handleAddToCollection} 
              className="w-full"
              variant="secondary"
            >
              Add to My Collection
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}