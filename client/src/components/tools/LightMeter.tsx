import React, { useState, useRef, useEffect } from "react";
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
  // State for image capture and identification
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lightValue, setLightValue] = useState<number | null>(null);
  const [currentLevel, setCurrentLevel] = useState<LightLevel | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Camera states
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  
  // Refs
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
  
  // Start camera automatically on load
  useEffect(() => {
    startCamera();
  }, []);

  // Start camera access
  const startCamera = async () => {
    try {
      // Check if MediaDevices API is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API is not supported in this browser');
      }
      
      // Request camera access
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
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

  // Capture and measure light from camera
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
      
      // Get image data from canvas
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
      
      // Create a thumbnail image from the canvas
      setSelectedImage(canvas.toDataURL('image/jpeg'));
      
      // Stop camera after capturing
      stopCamera();
      
      toast({
        title: "Light measured!",
        description: `Detected ${level.name} (${estimatedLux} lux) - ideal for ${level.suitable}.`
      });
    } catch (error) {
      console.error("Error capturing image:", error);
      setErrorMessage("Failed to capture image. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const resetMeasurement = () => {
    setSelectedImage(null);
    setLightValue(null);
    setCurrentLevel(null);
    setErrorMessage(null);
    startCamera();
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <p className="text-sm mb-6">
        Use your camera to measure the light level at your plant's location and get plant recommendations.
      </p>
      
      {errorMessage && (
        <div className="rounded-md bg-red-50 p-4 mb-4">
          <p className="text-sm text-red-700">{errorMessage}</p>
        </div>
      )}
      
      {/* Show camera view if no result yet */}
      {(!lightValue || !currentLevel) && (
        <div className="space-y-4">
          <div className="relative w-full aspect-video bg-neutral-medium bg-opacity-30 rounded-lg overflow-hidden">
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
                <CameraIcon className="h-12 w-12 text-neutral-dark opacity-60 mb-2" />
                <p className="text-neutral-dark opacity-70 text-center px-4">
                  {!errorMessage ? "Starting camera..." : "Camera access needed. Tap to try again."}
                </p>
                {!isCameraActive && errorMessage && (
                  <Button
                    onClick={startCamera}
                    className="mt-4"
                    variant="outline"
                  >
                    Try Again
                  </Button>
                )}
              </div>
            )}
          </div>
          
          {/* Hidden canvas for processing camera image */}
          <canvas 
            ref={canvasRef} 
            className="hidden"
          />
        </div>
      )}
      
      {isProcessing && (
        <div className="mb-6 space-y-3">
          <Progress value={66} className="h-2" />
          <p className="text-sm text-center text-neutral-dark">
            Measuring light level... This may take a few seconds.
          </p>
        </div>
      )}
      
      {currentLevel && lightValue !== null && (
        <div className="space-y-4 mb-6">
          <Card className="p-4 overflow-hidden">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
              <div>
                <h3 className="text-xl font-medium">{currentLevel.name}</h3>
                <p className="text-sm text-neutral-dark">{lightValue} lux</p>
                <p className="text-sm mt-1">{currentLevel.description}</p>
              </div>
              <SunIcon className="w-10 h-10 text-yellow-500 self-start sm:self-center" />
            </div>
            
            <div className="mt-4">
              <h4 className="font-medium mb-2">Suitable Plants:</h4>
              <div className="p-3 bg-neutral-medium bg-opacity-30 rounded-lg">
                <p className="text-sm">{currentLevel.suitable}</p>
              </div>
            </div>
            
            <div className="mt-6 flex gap-3">
              <Button 
                onClick={resetMeasurement}
                variant="outline"
                className="flex-1"
              >
                Take Another Reading
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}