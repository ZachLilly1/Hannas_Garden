import { useState, useRef, useEffect } from 'react';
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
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCapture = async () => {
    setErrorMessage(null);
    setIsCapturing(true);
    
    try {
      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: {
          facingMode: 'environment', // Use the back camera
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setErrorMessage('Could not access camera. Please allow camera permissions and ensure no other app is using it.');
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

  return (
    <div className="p-4">
      <h2 className="text-xl font-medium mb-4">Light Meter</h2>
      <p className="text-sm mb-6">
        This tool uses your phone's camera to estimate the light level in your plant's location.
        Point your camera at the area where your plant is (or will be) placed for an accurate reading.
      </p>
      
      <div className="flex flex-col items-center justify-center">
        {errorMessage && (
          <div className="rounded-md bg-red-50 p-4 mb-4 w-full">
            <p className="text-sm text-red-700">{errorMessage}</p>
          </div>
        )}
        
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
        
        <Button 
          size="lg"
          onClick={isCapturing ? stopCapture : startCapture}
          className="mb-6"
        >
          {isCapturing ? "Cancel" : lightValue !== null ? "Take New Reading" : "Start Light Meter"}
        </Button>
        
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