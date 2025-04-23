import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { CameraIcon, SunIcon } from '@/lib/icons';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  // State for image upload and processing
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lightValue, setLightValue] = useState<number | null>(null);
  const [currentLevel, setCurrentLevel] = useState<LightLevel | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("upload");
  const [manualLightValue, setManualLightValue] = useState<number>(2500);
  
  // Camera states
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Clean up resources on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // Handle tab changes
  const handleTabChange = (value: string) => {
    // Clear any previous errors
    setErrorMessage(null);
    setActiveTab(value);
    
    // Stop camera if switching from camera tab
    if (value !== "camera" && isCameraActive) {
      stopCamera();
    }
    
    // Switch to camera mode if needed
    if (value === "camera") {
      startCamera();
    }
    
    // Set initial manual reading if switching to manual mode
    if (value === "manual" && !lightValue) {
      updateManualLightLevel(manualLightValue);
    }
  };

  // Start camera access
  const startCamera = async () => {
    try {
      // Check if MediaDevices API is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API is not supported in this browser');
      }
      
      // Request camera access
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: true 
      });
      
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
        setIsCameraActive(true);
      }
    } catch (error: any) {
      console.error('Error accessing camera:', error);
      let errorMsg = 'Could not access camera. ';
      
      if (error.name && typeof error.name === 'string') {
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          errorMsg += 'Please allow camera permissions in your browser settings.';
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
          errorMsg += 'No camera found on this device.';
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
          errorMsg += 'Camera is already in use by another application.';
        } else {
          errorMsg += 'Try using a different browser or device.';
        }
      }
      
      setErrorMessage(errorMsg);
      // Switch to upload tab if camera fails
      setActiveTab("upload");
    }
  };

  // Stop camera access
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsCameraActive(false);
  };

  // Measure light from camera
  const captureAndMeasureLight = () => {
    if (!isCameraActive || !videoRef.current || !canvasRef.current) {
      return;
    }
    
    setIsProcessing(true);
    
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (!context) {
        throw new Error("Failed to get canvas context");
      }
      
      // Set canvas size to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw current video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Process the image data to get light level
      processCanvasForLightLevel(canvas);
      
      // Stop camera after capturing
      stopCamera();
    } catch (error) {
      console.error("Error capturing image:", error);
      setErrorMessage("Failed to capture image. Please try again.");
      setIsProcessing(false);
    }
  };

  // Process canvas data to determine light level
  const processCanvasForLightLevel = (canvas: HTMLCanvasElement) => {
    try {
      const context = canvas.getContext('2d');
      if (!context) return;
      
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
        
        // Calculate perceived brightness using the formula: 0.299R + 0.587G + 0.114B
        const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
        
        totalBrightness += brightness;
        pixelCount++;
      }
      
      const averageBrightness = totalBrightness / pixelCount;
      
      // Convert brightness to estimated lux (rough approximation)
      const estimatedLux = Math.round(averageBrightness * 100);
      
      setLightValue(estimatedLux);
      
      // Find the corresponding light level
      const level = LIGHT_LEVELS.find(level => 
        estimatedLux >= level.range[0] && estimatedLux <= level.range[1]
      ) || LIGHT_LEVELS[LIGHT_LEVELS.length - 1];
      
      setCurrentLevel(level);
      setIsProcessing(false);
    } catch (error) {
      console.error("Error processing light level:", error);
      setErrorMessage("Failed to analyze light level from image.");
      setIsProcessing(false);
    }
  };

  // Handle image file selection
  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      
      setIsProcessing(true);
      
      // Create a preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setSelectedImage(e.target.result as string);
          processImageForLightLevel(e.target.result as string);
        }
      };
      reader.onerror = () => {
        setErrorMessage("Failed to read the selected image file.");
        setIsProcessing(false);
      };
      
      reader.readAsDataURL(file);
    }
  };

  // Trigger file input click
  const handleImageClick = () => {
    fileInputRef.current?.click();
  };
  
  // Process an image to estimate light level
  const processImageForLightLevel = (imageUrl: string) => {
    const img = new Image();
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      if (!context) {
        setIsProcessing(false);
        setErrorMessage("Failed to process image. Browser may not support canvas.");
        return;
      }
      
      // Set canvas size to match image
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Draw the image onto the canvas
      context.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      // Process the canvas
      processCanvasForLightLevel(canvas);
    };
    
    img.onerror = () => {
      setIsProcessing(false);
      setErrorMessage("Failed to load image. Please try a different image.");
    };
    
    img.src = imageUrl;
  };
  
  // Update manual light level
  const updateManualLightLevel = (value: number) => {
    setManualLightValue(value);
    
    // Find the corresponding light level
    const level = LIGHT_LEVELS.find(level => 
      value >= level.range[0] && value <= level.range[1]
    ) || LIGHT_LEVELS[LIGHT_LEVELS.length - 1];
    
    setCurrentLevel(level);
    setLightValue(value);
  };
  
  // Reset to initial state
  const resetLightMeter = () => {
    setSelectedImage(null);
    setLightValue(null);
    setCurrentLevel(null);
    setErrorMessage(null);
    stopCamera();
    
    if (activeTab === "manual") {
      updateManualLightLevel(manualLightValue);
    }
  };

  // Render result card
  const renderLightMeterResult = () => {
    if (!currentLevel || lightValue === null) return null;
    
    return (
      <Card className="p-6 mt-6 max-w-md mx-auto">
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
          onClick={resetLightMeter}
        >
          Take Another Reading
        </Button>
      </Card>
    );
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <p className="text-sm mb-6">
        This tool helps estimate the light level in your plant's location.
        Choose one of the methods below to measure light.
      </p>
      
      {errorMessage && (
        <div className="rounded-md bg-red-50 p-4 mb-4 w-full">
          <p className="text-sm text-red-700">{errorMessage}</p>
        </div>
      )}
      
      {/* Only show tabs if we don't have a result yet */}
      {(!lightValue || !currentLevel) && (
        <Tabs 
          value={activeTab} 
          onValueChange={handleTabChange}
          className="w-full"
        >
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="upload">Upload Image</TabsTrigger>
            <TabsTrigger value="camera">Use Camera</TabsTrigger>
            <TabsTrigger value="manual">Manual Entry</TabsTrigger>
          </TabsList>
          
          <TabsContent value="upload" className="space-y-4">
            {/* Hidden file input */}
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
                    alt="Selected area" 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-40 flex flex-col items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <CameraIcon className="h-8 w-8 text-white mb-2" />
                    <p className="text-sm text-white">Change image</p>
                  </div>
                </>
              ) : (
                <>
                  <CameraIcon className="h-12 w-12 text-neutral-500 mb-2" />
                  <p className="text-neutral-500">Tap to upload a photo of your plant's location</p>
                </>
              )}
            </div>
            
            {isProcessing && (
              <div className="space-y-3 mt-4">
                <Progress value={66} className="h-2" />
                <p className="text-sm text-center text-neutral-500">
                  Processing image... This may take a moment.
                </p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="camera" className="space-y-4">
            <div className="relative w-full aspect-video bg-neutral-100 rounded-lg overflow-hidden">
              {isCameraActive ? (
                <>
                  <video 
                    ref={videoRef} 
                    className="w-full h-full object-cover"
                    playsInline
                    autoPlay
                  />
                  <Button
                    onClick={captureAndMeasureLight}
                    className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-2"
                    disabled={isProcessing}
                  >
                    <CameraIcon className="h-5 w-5" />
                    {isProcessing ? "Processing..." : "Capture Light Level"}
                  </Button>
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center">
                  <CameraIcon className="h-12 w-12 text-neutral-500 mb-2" />
                  <p className="text-neutral-500 text-center px-4">
                    Camera access needed. You'll be prompted to allow camera access.
                  </p>
                </div>
              )}
            </div>
            
            {/* Hidden canvas for processing camera image */}
            <canvas 
              ref={canvasRef} 
              className="hidden"
            />
            
            {isProcessing && (
              <div className="space-y-3 mt-4">
                <Progress value={66} className="h-2" />
                <p className="text-sm text-center text-neutral-500">
                  Processing... This may take a moment.
                </p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="manual" className="space-y-6">
            <p className="text-sm">
              Drag the slider to manually indicate the approximate brightness level.
            </p>
            
            <div className="space-y-8 py-4">
              <div className="flex items-center justify-between text-sm">
                <span>Low Light</span>
                <span>Bright Light</span>
              </div>
              
              <Slider
                value={[manualLightValue]}
                min={0}
                max={10000}
                step={100}
                onValueChange={(values) => updateManualLightLevel(values[0])}
                className="my-6"
              />
              
              <div className="text-center">
                <SunIcon className="w-12 h-12 mx-auto mb-2 text-yellow-500" />
                <span className="block text-3xl font-bold">{manualLightValue} lux</span>
                <span className="block text-lg font-medium">
                  {currentLevel?.name || "Adjusting..."}
                </span>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      )}
      
      {/* Display result */}
      {renderLightMeterResult()}
    </div>
  );
}