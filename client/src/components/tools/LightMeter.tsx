import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CameraIcon, SunIcon } from '@/lib/icons';
import { cn } from '@/lib/utils';

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
  const [isCapturing, setIsCapturing] = useState(false);
  const [lightValue, setLightValue] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentLevel, setCurrentLevel] = useState<LightLevel | null>(null);
  const [useManualMode, setUseManualMode] = useState(false); // Start with camera mode to request permissions
  const [manualLightValue, setManualLightValue] = useState<number>(2500); // Default to medium light
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCapture = async () => {
    setErrorMessage(null);
    setIsCapturing(true);
    
    try {
      // Check if MediaDevices API is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API is not supported in this browser');
      }
      
      // Request camera access with more permissive constraints
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true  // Simplified constraints for better compatibility
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (error: any) { // Type assertion for error
      console.error('Error accessing camera:', error);
      let errorMsg = 'Could not access camera. ';
      
      // Check error properties with proper type handling
      if (error.name && typeof error.name === 'string') {
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          errorMsg += 'Please allow camera permissions in your browser settings.';
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
          errorMsg += 'No camera found on this device.';
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
          errorMsg += 'Camera is already in use by another application.';
        } else if (error.name === 'OverconstrainedError') {
          errorMsg += 'Camera does not meet the required constraints.';
        } else {
          errorMsg += 'Try using a different browser or device.';
        }
      } else {
        errorMsg += 'Try using a different browser or device.';
      }
      
      setErrorMessage(errorMsg);
      setIsCapturing(false);
    }
  };

  const stopCapture = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsCapturing(false);
  };

  const measureLight = () => {
    if (!isCapturing || !videoRef.current || !canvasRef.current) {
      return;
    }
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) return;
    
    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw the current video frame onto the canvas
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
      
      // Calculate perceived brightness
      // Using the formula: 0.299R + 0.587G + 0.114B
      const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
      
      totalBrightness += brightness;
      pixelCount++;
    }
    
    const averageBrightness = totalBrightness / pixelCount;
    
    // Convert brightness to estimated lux
    // This is a rough approximation
    const estimatedLux = Math.round(averageBrightness * 100);
    
    setLightValue(estimatedLux);
    
    // Find the corresponding light level
    const level = LIGHT_LEVELS.find(level => 
      estimatedLux >= level.range[0] && estimatedLux <= level.range[1]
    ) || LIGHT_LEVELS[LIGHT_LEVELS.length - 1];
    
    setCurrentLevel(level);
    
    // Stop capturing if we got a reading
    stopCapture();
  };

  useEffect(() => {
    // Clean up on component unmount
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    let interval: number | undefined;
    
    if (isCapturing) {
      // Take a reading after a short delay to give camera time to adjust
      interval = window.setTimeout(() => {
        measureLight();
      }, 2000);
    }
    
    return () => {
      if (interval) {
        clearTimeout(interval);
      }
    };
  }, [isCapturing]);

  // Function to update manual light value and level
  const updateManualLightLevel = useCallback((value: number) => {
    setManualLightValue(value);
    // Find the corresponding light level
    const level = LIGHT_LEVELS.find(level => 
      value >= level.range[0] && value <= level.range[1]
    ) || LIGHT_LEVELS[LIGHT_LEVELS.length - 1];
    
    setCurrentLevel(level);
    setLightValue(value);
  }, []);
  
  // Initialize mode settings when component loads
  useEffect(() => {
    if (useManualMode) {
      // Initialize manual mode
      updateManualLightLevel(manualLightValue);
    } else {
      // Auto-start camera mode to request permissions immediately
      startCapture();
    }
  }, [useManualMode, manualLightValue, updateManualLightLevel, startCapture]);

  // Switch to manual mode if camera error occurs
  // Automatically switch to manual mode when camera error occurs
  useEffect(() => {
    if (errorMessage && !useManualMode) {
      console.log("Switching to manual mode due to camera error");
      setUseManualMode(true);
      // Set initial manual reading
      updateManualLightLevel(manualLightValue);
    }
  }, [errorMessage, useManualMode, manualLightValue, updateManualLightLevel]);

  return (
    <div>
      <p className="text-sm mb-6">
        This tool {!useManualMode ? "uses your phone's camera to" : "helps you"} estimate the light level in your plant's location.
        {!useManualMode && " Point your camera at the area where your plant is (or will be) placed for an accurate reading."}
      </p>
      
      <div className="flex flex-col items-center justify-center">
        {errorMessage && (
          <div className="rounded-md bg-red-50 p-4 mb-4 w-full">
            <p className="text-sm text-red-700">{errorMessage}</p>
            {!useManualMode && (
              <button 
                className="text-sm font-medium text-primary mt-2"
                onClick={() => setUseManualMode(true)}
              >
                Switch to Manual Mode
              </button>
            )}
            {useManualMode && (
              <p className="text-sm mt-2">Using manual mode instead. You can adjust the light level using the slider below.</p>
            )}
          </div>
        )}
        
        {!useManualMode ? (
          // Camera-based light meter UI
          <>
            <div className="relative w-full max-w-md mb-4">
              <video 
                ref={videoRef} 
                className={cn(
                  "w-full aspect-video rounded-md bg-neutral-100",
                  isCapturing ? "block" : "hidden"
                )} 
                playsInline
              />
              
              <canvas 
                ref={canvasRef} 
                className="hidden"
              />
              
              {!isCapturing && lightValue !== null && (
                <div className="w-full aspect-video rounded-md bg-neutral-100 flex items-center justify-center">
                  <div className="text-center">
                    <SunIcon className="w-12 h-12 mx-auto mb-2 text-yellow-500" />
                    <span className="block text-3xl font-bold">{lightValue} lux</span>
                    <span className="block text-lg font-medium">{currentLevel?.name}</span>
                  </div>
                </div>
              )}
              
              {!isCapturing && lightValue === null && (
                <div className="w-full aspect-video rounded-md bg-neutral-100 flex items-center justify-center">
                  <div className="text-center text-neutral-500">
                    <CameraIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Press the button below to measure light</p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex space-x-3 mb-6">
              <Button 
                size="lg"
                onClick={isCapturing ? stopCapture : startCapture}
              >
                {isCapturing ? "Cancel" : lightValue !== null ? "Take New Reading" : "Start Light Meter"}
              </Button>
              
              <Button 
                variant="outline" 
                size="lg"
                onClick={() => {
                  stopCapture();
                  setUseManualMode(true);
                  updateManualLightLevel(manualLightValue);
                }}
              >
                Manual Mode
              </Button>
            </div>
          </>
        ) : (
          // Manual light meter UI
          <>
            <div className="w-full max-w-md mb-4">
              <div className="w-full aspect-video rounded-md bg-neutral-100 flex items-center justify-center">
                <div className="text-center">
                  <SunIcon className="w-12 h-12 mx-auto mb-2 text-yellow-500" />
                  <span className="block text-3xl font-bold">{lightValue} lux</span>
                  <span className="block text-lg font-medium">{currentLevel?.name}</span>
                </div>
              </div>
            </div>
            
            <div className="w-full max-w-md mb-6">
              <label className="text-sm font-medium mb-2 block">
                Adjust Light Level:
              </label>
              <div className="grid grid-cols-4 gap-2 mb-3">
                {LIGHT_LEVELS.map((level, index) => (
                  <button
                    key={index}
                    className={cn(
                      "text-xs py-1 px-2 rounded border",
                      currentLevel?.name === level.name 
                        ? "bg-primary text-white border-primary" 
                        : "bg-white border-neutral-medium"
                    )}
                    onClick={() => updateManualLightLevel((level.range[0] + level.range[1]) / 2)}
                  >
                    {level.name}
                  </button>
                ))}
              </div>
              
              <input 
                type="range" 
                min="0" 
                max="10000" 
                step="100" 
                value={manualLightValue} 
                onChange={(e) => updateManualLightLevel(parseInt(e.target.value))}
                className="w-full"
              />
              
              <div className="flex justify-between text-xs text-neutral-dark">
                <span>Dark</span>
                <span>Bright</span>
              </div>
            </div>
            
            {!errorMessage && (
              <Button 
                variant="outline" 
                size="lg"
                className="mb-6"
                onClick={() => {
                  setUseManualMode(false);
                  setLightValue(null);
                  setCurrentLevel(null);
                }}
              >
                Use Camera Instead
              </Button>
            )}
          </>
        )}
        
        {currentLevel && (
          <Card className="w-full p-4 mb-4">
            <h3 className="font-medium mb-2">{currentLevel.name} ({lightValue} lux)</h3>
            <p className="text-sm mb-2">{currentLevel.description}</p>
            <div>
              <strong className="text-sm">Suitable plants:</strong>
              <p className="text-sm">{currentLevel.suitable}</p>
            </div>
          </Card>
        )}
        
        <div className="w-full mt-4">
          <h3 className="text-sm font-medium mb-2">Light Level Reference:</h3>
          <div className="space-y-2">
            {LIGHT_LEVELS.map((level, index) => (
              <div 
                key={index} 
                className={cn(
                  "text-xs p-2 rounded-md",
                  currentLevel?.name === level.name 
                    ? "bg-primary bg-opacity-10 border border-primary" 
                    : "bg-neutral-100"
                )}
              >
                <div className="font-medium">
                  {level.name} ({level.range[0]} - {level.range[1]} lux)
                </div>
                <div className="text-neutral-600">{level.suitable}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}