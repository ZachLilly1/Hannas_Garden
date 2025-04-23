import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CameraIcon, SunIcon } from "@/lib/icons";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";

type LightLevel = {
  name: string;
  range: [number, number]; // [min, max] in lux
  description: string;
  suitable: string;
};

const LIGHT_LEVELS: LightLevel[] = [
  {
    name: "Low Light",
    range: [0, 1000],
    description: "Dim light, suitable for shade-loving plants",
    suitable: "Peace Lily, Snake Plant, ZZ Plant, Pothos"
  },
  {
    name: "Medium Light",
    range: [1000, 5000],
    description: "Medium, indirect light",
    suitable: "Philodendron, Fern, Anthurium, Spider Plant"
  },
  {
    name: "Bright Indirect Light",
    range: [5000, 10000],
    description: "Bright, but not direct sunlight",
    suitable: "Fiddle Leaf Fig, Monstera, Orchid, Bird of Paradise"
  },
  {
    name: "Direct Sunlight",
    range: [10000, 100000],
    description: "Full, direct sunshine",
    suitable: "Succulents, Cacti, Aloe Vera, Citrus plants"
  }
];

export function LightMeter() {
  // State for image upload and identification
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lightValue, setLightValue] = useState<number | null>(null);
  const [currentLevel, setCurrentLevel] = useState<LightLevel | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Handle image file selection
  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      
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
    fileInputRef.current?.click();
  };
  
  // Reset the measurement process
  const resetMeasurement = () => {
    setSelectedImage(null);
    setLightValue(null);
    setCurrentLevel(null);
    setErrorMessage(null);
  };

  // Measure light from image
  const measureLight = async () => {
    if (!selectedImage) {
      toast({
        title: "No image selected",
        description: "Please upload an image of your plant's location first.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsProcessing(true);
      
      // Extract base64 data from the data URL
      const base64Data = selectedImage.split(',')[1];
      
      // Process the image
      processImageForLightLevel(selectedImage);
      
    } catch (error) {
      console.error("Error measuring light:", error);
      let errorMessage = "Unable to process the image.";
      
      if (error instanceof Error) {
        errorMessage = `${errorMessage} ${error.message}`;
      }
      
      toast({
        title: "Measurement failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Process an image to estimate light level
  const processImageForLightLevel = (imageUrl: string) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        if (!context) {
          throw new Error("Failed to get canvas context");
        }
        
        // Set canvas size to match image
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw the image onto the canvas
        context.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Get image data
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;
        
        // Calculate average brightness
        let totalBrightness = 0;
        let pixelCount = 0;
        
        for (let i = 0; i < pixels.length; i += 4) {
          const r = pixels[i];
          const g = pixels[i + 1];
          const b = pixels[i + 2];
          
          // Calculate perceived brightness using formula: 0.299R + 0.587G + 0.114B
          const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
          
          totalBrightness += brightness;
          pixelCount++;
        }
        
        const averageBrightness = totalBrightness / pixelCount;
        
        // Convert brightness to estimated lux (rough approximation)
        const estimatedLux = Math.round(averageBrightness * 100);
        
        // Find the corresponding light level
        const level = LIGHT_LEVELS.find(level => 
          estimatedLux >= level.range[0] && estimatedLux <= level.range[1]
        ) || LIGHT_LEVELS[LIGHT_LEVELS.length - 1];
        
        setLightValue(estimatedLux);
        setCurrentLevel(level);
        
        toast({
          title: "Light measured!",
          description: `Detected ${level.name} (${estimatedLux} lux) - ideal for ${level.suitable}.`
        });
      } catch (error) {
        console.error("Error processing image:", error);
        setErrorMessage("Failed to analyze the image. Please try again.");
      } finally {
        setIsProcessing(false);
      }
    };
    
    img.onerror = () => {
      setIsProcessing(false);
      setErrorMessage("Failed to load image. Please try a different image.");
    };
    
    img.src = imageUrl;
  };

  return (
    <div>
      <p className="text-sm mb-6">
        Take or upload a photo of your plant's location to measure the light level and get plant recommendations.
      </p>
      
      <div className="mb-6">
        <input 
          type="file" 
          ref={fileInputRef}
          accept="image/*"
          className="hidden"
          onChange={handleImageChange}
        />
        
        <div 
          onClick={handleImageClick}
          className="h-56 bg-neutral-100 rounded-lg flex flex-col items-center justify-center cursor-pointer relative overflow-hidden"
        >
          {selectedImage ? (
            <>
              <img 
                src={selectedImage}
                alt="Selected location" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                <CameraIcon className="h-8 w-8 text-white mb-2" />
                <p className="text-sm text-white">Change photo</p>
              </div>
            </>
          ) : (
            <>
              <CameraIcon className="h-12 w-12 text-neutral-500 mb-2" />
              <p className="text-neutral-500">Tap to take or upload a photo</p>
            </>
          )}
        </div>
      </div>
      
      {selectedImage && !isProcessing && !currentLevel && (
        <div className="flex justify-center mb-6">
          <Button 
            onClick={measureLight} 
            size="lg"
            className="flex items-center gap-2"
          >
            <SunIcon className="h-5 w-5" />
            Measure Light Level
          </Button>
        </div>
      )}
      
      {isProcessing && (
        <div className="mb-6 space-y-3">
          <Progress value={66} className="h-2" />
          <p className="text-sm text-center text-neutral-500">
            Measuring light level... This may take a few seconds.
          </p>
        </div>
      )}
      
      {currentLevel && lightValue !== null && (
        <Card className="p-6 mb-6">
          <div className="text-center mb-4">
            <SunIcon className="w-16 h-16 mx-auto mb-2 text-yellow-500" />
            <h3 className="text-2xl font-bold">{currentLevel.name}</h3>
            <p className="text-3xl font-bold text-primary">{lightValue} lux</p>
          </div>
          
          <div className="space-y-4 mt-4">
            <div>
              <h4 className="font-medium mb-1">Description</h4>
              <p className="text-sm">{currentLevel.description}</p>
            </div>
            
            <div>
              <h4 className="font-medium mb-1">Suitable Plants</h4>
              <p className="text-sm">{currentLevel.suitable}</p>
            </div>
          </div>
          
          <Button 
            variant="outline" 
            className="w-full mt-6"
            onClick={resetMeasurement}
          >
            Take Another Reading
          </Button>
        </Card>
      )}
      
      {errorMessage && (
        <div className="rounded-md bg-red-50 p-4 mb-4">
          <p className="text-sm text-red-700">{errorMessage}</p>
        </div>
      )}
    </div>
  );
}