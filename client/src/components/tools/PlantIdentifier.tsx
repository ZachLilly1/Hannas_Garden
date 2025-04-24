import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CameraIcon, LeafIcon } from "@/lib/icons";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

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
  // State for image upload and identification
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [identificationResult, setIdentificationResult] = useState<PlantIdentificationResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Handle image file selection
  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setImageFile(file);
      
      // Create a preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setSelectedImage(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Trigger file input click
  const handleImageClick = () => {
    // Allows user to choose between camera and gallery on mobile devices
    fileInputRef.current?.click();
  };
  
  // Reset the identification process
  const resetIdentification = () => {
    setSelectedImage(null);
    setImageFile(null);
    setIdentificationResult(null);
  };

  // Identify plant using OpenAI
  const identifyPlant = async () => {
    if (!selectedImage) {
      toast({
        title: "No image selected",
        description: "Please upload an image of your plant first.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsIdentifying(true);
      
      // Extract base64 data from the data URL
      const base64Data = selectedImage.split(',')[1];
      
      // Call the identification API
      const response = await fetch('/api/identify-plant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: base64Data
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${await response.text()}`);
      }
      
      // Parse JSON response
      const result = await response.json() as PlantIdentificationResult;
      console.log("Plant identification result:", result);
      
      setIdentificationResult(result);
      
      toast({
        title: "Plant identified!",
        description: `Identified as ${result.commonName || 'Unknown plant'} with ${result.confidence || 'unknown'} confidence.`
      });
    } catch (error) {
      console.error("Error identifying plant:", error);
      let errorMessage = "Unable to identify the plant.";
      
      if (error instanceof Error) {
        if (error.message.includes("entity too large")) {
          errorMessage = "The image is too large. Please try with a smaller image or resize it.";
        } else if (error.message.includes("NetworkError") || error.message.includes("Failed to fetch")) {
          errorMessage = "Network connection issue. Please check your internet connection.";
        } else if (error.message.includes("timeout")) {
          errorMessage = "The request timed out. Please try with a smaller image or try again later.";
        } else {
          errorMessage = `${errorMessage} ${error.message}`;
        }
      }
      
      toast({
        title: "Identification failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsIdentifying(false);
    }
  };

  // Get care icons based on level
  const getCareLevelIcon = (level: string) => {
    switch(level) {
      case 'low':
        return '😌 Low';
      case 'medium':
        return '😊 Medium';
      case 'high':
        return '😎 High';
      default:
        return '❓ Unknown';
    }
  };

  return (
    <div>
      <p className="text-sm mb-6">
        Take or upload a photo of any plant to identify it and get detailed care instructions.
      </p>
      
      <div className="mb-6">
        <input 
          type="file" 
          ref={fileInputRef}
          accept="image/*"
          className="hidden"
          onChange={handleImageChange}
        />
        
        {selectedImage ? (
          <div className="mb-3">
            <div className="h-56 rounded-lg relative overflow-hidden">
              <img 
                src={selectedImage}
                alt="Selected plant" 
                className="w-full h-full object-cover"
              />
              <div 
                onClick={handleImageClick}
                className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                <CameraIcon className="h-8 w-8 text-white mb-2" />
                <p className="text-sm text-white">Change photo</p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div 
              onClick={handleImageClick}
              className="h-56 bg-neutral-medium bg-opacity-30 rounded-lg flex flex-col items-center justify-center cursor-pointer relative overflow-hidden mb-3"
            >
              <CameraIcon className="h-12 w-12 text-neutral-dark opacity-60 mb-2" />
              <p className="text-neutral-dark opacity-70">Tap to take a photo</p>
            </div>
            
            <div className="flex justify-center">
              <Button
                onClick={handleImageClick}
                variant="outline"
                className="flex items-center gap-2"
              >
                <CameraIcon className="h-5 w-5" />
                Upload from Gallery
              </Button>
            </div>
          </>
        )}
      </div>
      
      {selectedImage && !isIdentifying && !identificationResult && (
        <div className="flex justify-center mb-6">
          <Button 
            onClick={identifyPlant} 
            size="lg"
            className="flex items-center gap-2"
          >
            <LeafIcon className="h-5 w-5" />
            Identify Plant
          </Button>
        </div>
      )}
      
      {isIdentifying && (
        <div className="mb-6 space-y-3">
          <Progress value={66} className="h-2" />
          <p className="text-sm text-center text-neutral-dark">
            Identifying your plant... This may take a few seconds.
          </p>
        </div>
      )}
      
      {identificationResult && (
        <div className="space-y-4 mb-6">
          <Card className="p-4 overflow-hidden">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
              <div>
                <h3 className="text-xl font-medium">{identificationResult.commonName}</h3>
                <p className="text-sm text-neutral-dark italic">{identificationResult.scientificName}</p>
                <p className="text-sm mt-1">Type: <span className="font-medium capitalize">{identificationResult.plantType}</span></p>
              </div>
              <Badge className="self-start sm:self-center" variant={
                identificationResult.confidence === "high" ? "default" : 
                identificationResult.confidence === "medium" ? "outline" : "secondary"
              }>
                {identificationResult.confidence} confidence
              </Badge>
            </div>
            
            <div className="mt-4">
              <h4 className="font-medium mb-2">Care Instructions:</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium">Water</p>
                  <p className="text-sm">Every {identificationResult.careRecommendations.waterFrequency} days</p>
                </div>
                <div className="p-3 bg-yellow-50 rounded-lg">
                  <p className="text-sm font-medium">Sunlight</p>
                  <p className="text-sm">{getCareLevelIcon(identificationResult.careRecommendations.sunlightLevel)}</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-sm font-medium">Fertilizer</p>
                  <p className="text-sm">Every {identificationResult.careRecommendations.fertilizerFrequency} days</p>
                </div>
                <div className="p-3 bg-neutral-medium bg-opacity-30 rounded-lg">
                  <p className="text-sm font-medium">Plant Type</p>
                  <p className="text-sm capitalize">{identificationResult.plantType}</p>
                </div>
              </div>
              
              <div className="mt-3 p-3 bg-neutral-medium bg-opacity-30 rounded-lg">
                <p className="text-sm font-medium">Additional Care Tips:</p>
                <p className="text-sm mt-1">{identificationResult.careRecommendations.additionalCare}</p>
              </div>
            </div>
            
            <div className="mt-6 flex gap-3">
              <Button 
                onClick={resetIdentification}
                variant="outline"
                className="flex-1"
              >
                Identify Another Plant
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

export default PlantIdentifier;