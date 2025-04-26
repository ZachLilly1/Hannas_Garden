import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Camera, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

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

export function PlantIdentifier() {
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
        // For the preview we use the full data URL
        setPreview(base64String);

        // For the backend API, we either keep the full string or ensure it's valid
        if (base64String.startsWith('data:image/')) {
          setImage(base64String); // Store the complete data URL for consistency
        } else {
          // If it's somehow not properly formatted, make sure it's valid
          const imageType = file.type || 'image/jpeg';
          const base64Content = base64String.includes(',') 
            ? base64String.split(',')[1]
            : base64String;
          setImage(`data:${imageType};base64,${base64Content}`);
        }
      };
      
      reader.readAsDataURL(file);
    }
  };

  // Handle camera capture on mobile
  const handleCameraCapture = () => {
    if (fileInputRef.current) {
      // Setting capture attribute dynamically for camera
      fileInputRef.current.setAttribute('capture', 'environment');
      fileInputRef.current.click();
    }
  };

  // Handle upload button click
  const handleUploadClick = () => {
    if (fileInputRef.current) {
      // Remove capture attribute to ensure gallery opens instead of camera
      fileInputRef.current.removeAttribute('capture');
      fileInputRef.current.click();
    }
  };

  // Mutation for identifying plants
  const identifyMutation = useMutation({
    mutationFn: async (imageBase64: string) => {
      // Make sure we're sending the image with proper prefix to the server
      const payload = {
        imageBase64: imageBase64.startsWith('data:image/') 
          ? imageBase64 
          : `data:image/jpeg;base64,${imageBase64}`
      };
      
      const res = await apiRequest('POST', '/api/identify-plant', payload);
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

  // Plant identification functionality only - no collection adding

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
        
        <CardContent className="space-y-4">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
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
      </Card>
    </div>
  );
}