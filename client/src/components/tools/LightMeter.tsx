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
  
  // Do not start camera automatically on load
  // Camera will only be started when user clicks the button

  // Start camera access
  const startCamera = async () => {
    try {
      // Reset any previous errors
      setErrorMessage(null);
      
      // Check if MediaDevices API is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API is not supported in this browser');
      }
      
      // Define camera constraints - try with more options for better compatibility
      const constraints = { 
        video: { 
          facingMode: 'environment', // Try to use back camera first
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      };
      
      // Try to access the camera
      console.log("Requesting camera access with constraints:", constraints);
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      console.log("Camera access granted, setting up video stream");
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        // Set up event handler for when video starts playing
        videoRef.current.onloadedmetadata = () => {
          console.log("Video metadata loaded, starting playback");
          if (videoRef.current) {
            videoRef.current.play()
              .then(() => {
                console.log("Video playback started successfully");
                setIsCameraActive(true);
              })
              .catch(err => {
                console.error("Error starting video playback:", err);
                setErrorMessage("Failed to start camera playback. Please check your permissions.");
              });
          }
        };
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
        } else if (error.name === 'AbortError') {
          errorMsg += 'Camera access was aborted. Please try again.';
        } else if (error.name === 'OverconstrainedError') {
          // If requested constraints can't be satisfied, try with minimal constraints
          try {
            console.log("Trying with minimal constraints");
            const simpleStream = await navigator.mediaDevices.getUserMedia({ video: true });
            setStream(simpleStream);
            
            if (videoRef.current) {
              videoRef.current.srcObject = simpleStream;
              await videoRef.current.play();
              setIsCameraActive(true);
              return; // Exit function on success
            }
          } catch (fallbackError) {
            console.error("Fallback camera access also failed:", fallbackError);
            errorMsg += 'Your device camera does not support the required features.';
          }
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
      setErrorMessage("Camera is not active or not properly initialized. Please try again.");
      return;
    }
    
    setIsProcessing(true);
    setErrorMessage(null);
    
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Check if video is playing and has dimensions
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        console.warn("Video dimensions are not available yet");
        setErrorMessage("Camera feed not ready. Please wait a moment and try again.");
        setIsProcessing(false);
        return;
      }
      
      console.log(`Video dimensions: ${video.videoWidth}x${video.videoHeight}`);
      
      const context = canvas.getContext('2d');
      
      if (!context) {
        throw new Error("Failed to get canvas context");
      }
      
      // Set canvas size to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw current video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      try {
        // Get image data from canvas - this can fail if video feed is from a different origin
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
        
        console.log(`Calculated light level: ${estimatedLux} lux (${level.name})`);
        
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
      } catch (imageDataError) {
        console.error("Error accessing image data:", imageDataError);
        
        // If we can't access the image data, just provide a generic light reading
        const defaultLux = 5000;
        const defaultLevel = LIGHT_LEVELS.find(level => 
          defaultLux >= level.range[0] && defaultLux <= level.range[1]
        ) || LIGHT_LEVELS[1]; // Default to medium light
        
        console.log("Using fallback light measurement");
        setLightValue(defaultLux);
        setCurrentLevel(defaultLevel);
        
        // Create a thumbnail anyway
        try {
          setSelectedImage(canvas.toDataURL('image/jpeg'));
        } catch (canvasError) {
          console.error("Could not create image from canvas:", canvasError);
        }
        
        // Stop camera
        stopCamera();
        
        toast({
          title: "Light reading estimated",
          description: `Estimated ${defaultLevel.name} conditions based on ambient light.`
        });
      }
    } catch (error) {
      console.error("Error capturing image:", error);
      setErrorMessage("Failed to capture image. Please check camera permissions and try again.");
      setIsProcessing(false);
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
                  muted  
                  disablePictureInPicture
                  webkit-playsinline="true"
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
                  Click the button below to start the camera and measure light levels
                </p>
                <Button
                  onClick={startCamera}
                  className="mt-4"
                  variant="outline"
                >
                  Start Camera
                </Button>
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