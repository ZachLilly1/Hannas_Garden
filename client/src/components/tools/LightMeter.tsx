import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CameraIcon, SunIcon } from "@/lib/icons";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { X, Upload } from "lucide-react";

type LightLevel = {
  name: string;
  range: [number, number]; // [min, max] in lux
  description: string;
  suitable: string;
};

const LIGHT_LEVELS: LightLevel[] = [
  {
    name: "Very Low Light",
    range: [0, 300],
    description: "Very dim light conditions, such as far from windows or in halls",
    suitable: "Snake Plant, ZZ Plant, Cast Iron Plant, Chinese Evergreen"
  },
  {
    name: "Low Light",
    range: [300, 800],
    description: "Dim light, typical of north-facing windows or interior spaces",
    suitable: "Peace Lily, Pothos, Philodendron, Calathea, Ferns"
  },
  {
    name: "Medium Light",
    range: [800, 2500],
    description: "Moderate indirect light, like east-facing windows or bright rooms",
    suitable: "Spider Plant, Dracaena, Anthurium, Bird's Nest Fern, Rubber Plant"
  },
  {
    name: "Bright Indirect Light",
    range: [2500, 10000],
    description: "Bright light without direct sun rays, typical of west-facing windows",
    suitable: "Fiddle Leaf Fig, Monstera, Peperomia, Areca Palm, Bird of Paradise"
  },
  {
    name: "Direct Light",
    range: [10000, 25000],
    description: "Several hours of direct sun or very bright indirect light",
    suitable: "Croton, String of Pearls, Jade Plant, African Milk Tree"
  },
  {
    name: "Intense Sunlight",
    range: [25000, 100000],
    description: "Full, prolonged direct sunshine through south-facing windows or outdoors",
    suitable: "Succulents, Cacti, Aloe Vera, Agave, Citrus plants, Herbs"
  }
];

export function LightMeter() {
  // State for image and results
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCameraView, setIsCameraView] = useState(false);
  const [lightValue, setLightValue] = useState<number | null>(null);
  const [currentLevel, setCurrentLevel] = useState<LightLevel | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Input element ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Camera elements
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  
  // Cleanup function for camera resources
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // Handle file selection from device
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setErrorMessage(null);
    
    // Validate file is an image
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select an image file.');
      return;
    }
    
    // Read the selected file and process it
    const reader = new FileReader();
    reader.onload = async (e) => {
      const imageDataUrl = e.target?.result as string;
      setCapturedImage(imageDataUrl);
      await processImageForLight(imageDataUrl);
    };
    reader.onerror = () => {
      setErrorMessage('Failed to read selected file. Please try again.');
    };
    reader.readAsDataURL(file);
  };
  
  // Trigger the file input click
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };
  
  // Open camera view
  const openCameraView = async () => {
    setIsCameraView(true);
    setErrorMessage(null);
    
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported by your browser');
      }
      
      // Start with a simpler constraint set (more compatible)
      let mediaStream;
      
      try {
        // First try with preferred settings
        console.log('Requesting camera with basic constraints');
        mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: true,
          audio: false
        });
      } catch (initialError) {
        console.error('Initial camera request failed:', initialError);
        
        // Fall back to specific constraints only if first attempt fails
        const videoConstraints = {
          video: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        };
        
        console.log('Trying fallback camera constraints:', videoConstraints);
        mediaStream = await navigator.mediaDevices.getUserMedia(videoConstraints);
      }
      
      // If we get here, we have a mediaStream
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        console.log('Camera stream set to video element');
        
        // Set up video playback once metadata is loaded
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            videoRef.current.play().catch(err => {
              console.error('Error starting video playback:', err);
              setErrorMessage('Could not start camera playback. Please check permissions.');
              closeCameraView();
            });
          }
        };
      }
    } catch (error: any) {
      console.error('Error opening camera:', error);
      
      let errorMsg = 'Could not access camera. ';
      if (error.name) {
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          errorMsg += 'Please allow camera access in your browser settings.';
        } else if (error.name === 'NotFoundError') {
          errorMsg += 'No camera found on this device.';
        } else if (error.name === 'OverconstrainedError') {
          errorMsg += 'Your device camera does not meet the required constraints.';
        } else if (error.name === 'NotSupportedError') {
          errorMsg += 'Your browser does not support camera access.';
        } else {
          errorMsg += `Error: ${error.message || 'Unknown error'}. Try using a different browser or device.`;
        }
      } else {
        errorMsg += `Error: ${error.message || 'Unknown error'}. Try using a different browser or device.`;
      }
      
      setErrorMessage(errorMsg);
      setIsCameraView(false);
    }
  };
  
  // Close camera view and release resources
  const closeCameraView = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsCameraView(false);
  };
  
  // Capture image from camera
  const captureImageFromCamera = async () => {
    if (!videoRef.current || !canvasRef.current) {
      setErrorMessage('Camera not initialized correctly.');
      return;
    }
    
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Ensure video is playing and has dimensions
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        setErrorMessage('Camera stream not ready. Please wait a moment and try again.');
        return;
      }
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Get canvas context and draw the current video frame
      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Could not get canvas context');
      }
      
      // Draw the video frame to the canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert canvas to data URL
      const imageDataUrl = canvas.toDataURL('image/jpeg');
      setCapturedImage(imageDataUrl);
      
      // Close camera view
      closeCameraView();
      
      // Process the captured image
      await processImageForLight(imageDataUrl);
    } catch (error) {
      console.error('Error capturing image:', error);
      setErrorMessage('Failed to capture image. Please try again.');
    }
  };
  
  // Process image to measure light
  const processImageForLight = async (imageDataUrl: string) => {
    setIsProcessing(true);
    setErrorMessage(null);
    
    // Create a temporary image element to load the image
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    
    img.onload = async () => {
      try {
        // Create a canvas to process the image
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        if (!context) {
          throw new Error('Could not create canvas context');
        }
        
        // Set canvas size to match image
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw image to canvas
        context.drawImage(img, 0, 0);
        
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
        
        // Calculate average brightness
        const averageBrightness = totalBrightness / pixelCount;
        
        // Convert to a more realistic lux estimation using a more sophisticated algorithm
        // Camera images don't have the dynamic range of human vision or light meters,
        // so we need to use a non-linear mapping that accounts for this limitation
        
        // First, apply a gamma correction to the average brightness to account for
        // the non-linear relationship between pixel values and actual light intensity
        const gamma = 2.2; // Standard gamma correction value
        const correctedBrightness = Math.pow(averageBrightness / 255, gamma) * 255;
        
        // Apply a logarithmic scaling that better matches how light intensity is perceived
        // and how actual lux values scale in real-world environments
        let estimatedLux;
        
        if (correctedBrightness < 5) {
          // Very dark environments (night/dim indoor)
          estimatedLux = Math.round(correctedBrightness * 20); // 0-100 lux range
        } else if (correctedBrightness < 15) {
          // Dim indoor lighting (hallways, ambient evening lighting)
          estimatedLux = Math.round(100 + Math.pow(correctedBrightness - 5, 1.5) * 30); // 100-400 lux
        } else if (correctedBrightness < 40) {
          // Standard indoor lighting (living rooms, offices)
          estimatedLux = Math.round(400 + Math.pow(correctedBrightness - 15, 1.7) * 35); // 400-2000 lux
        } else if (correctedBrightness < 100) {
          // Bright indoor or indirect outdoor light (near windows, overcast days)
          estimatedLux = Math.round(2000 + Math.pow(correctedBrightness - 40, 1.8) * 110); // 2000-10,000 lux
        } else if (correctedBrightness < 180) {
          // Indirect sunlight or very bright indoor (sunrooms, atriums)
          estimatedLux = Math.round(10000 + Math.pow(correctedBrightness - 100, 2) * 250); // 10,000-50,000 lux
        } else {
          // Direct sunlight
          estimatedLux = Math.round(50000 + Math.pow(correctedBrightness - 180, 2.2) * 300); // 50,000-100,000+ lux
        }
        
        // Apply a calibration factor based on typical smartphone camera exposure
        // Most smartphone cameras automatically adjust exposure, which can dramatically 
        // affect brightness values. This calibration helps counter that effect.
        const calibrationFactor = 1.35;
        estimatedLux = Math.round(estimatedLux * calibrationFactor);
        
        console.log(`Raw brightness: ${averageBrightness}, Corrected: ${correctedBrightness.toFixed(2)}, Estimated lux: ${estimatedLux}`);
        
        // Find the corresponding light level
        const level = LIGHT_LEVELS.find(level => 
          estimatedLux >= level.range[0] && estimatedLux <= level.range[1]
        ) || LIGHT_LEVELS[LIGHT_LEVELS.length - 1];
        
        console.log(`Measured light level: ${estimatedLux} lux (${level.name})`);
        
        // Update state with initial calculations
        setLightValue(estimatedLux);
        setCurrentLevel(level);
        
        // Check if OpenAI API Key is available for enhanced analysis
        // We don't need to display the API key in the UI, but we'll use it silently
        try {
          // Send to OpenAI for enhanced analysis
          const response = await fetch('/api/light-meter/analyze', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              imageData: imageDataUrl,
              rawBrightness: averageBrightness,
              correctedBrightness: correctedBrightness,
              estimatedLux: estimatedLux,
              calculatedLevel: level
            }),
          });
          
          if (response.ok) {
            const aiAnalysis = await response.json();
            console.log('OpenAI light analysis:', aiAnalysis);
            
            // Update with AI-enhanced results if confidence is medium or high
            if (aiAnalysis.confidence !== 'low') {
              // Find the closest light level to the AI recommendation
              const aiLuxMidpoint = (aiAnalysis.lightLevel.luxRange[0] + aiAnalysis.lightLevel.luxRange[1]) / 2;
              const closestLevel = LIGHT_LEVELS.reduce((prev, curr) => {
                const prevMidpoint = (prev.range[0] + prev.range[1]) / 2;
                const currMidpoint = (curr.range[0] + curr.range[1]) / 2;
                return Math.abs(currMidpoint - aiLuxMidpoint) < Math.abs(prevMidpoint - aiLuxMidpoint) ? curr : prev;
              });
              
              // Silently update the level with AI recommendations
              setCurrentLevel({
                ...closestLevel,
                name: aiAnalysis.lightLevel.name || closestLevel.name,
                description: aiAnalysis.lightLevel.description || closestLevel.description,
                suitable: aiAnalysis.plantRecommendations.recommended.join(", ")
              });
              
              toast({
                title: "Light analyzed with AI!",
                description: `Detected ${aiAnalysis.lightLevel.name} (${estimatedLux} lux) - ideal for specialized plants.`,
                variant: "default"
              });
            } else {
              // Use our algorithmic calculation if AI confidence is low
              toast({
                title: "Light measured successfully!",
                description: `Detected ${level.name} (${estimatedLux} lux) - ideal for ${level.suitable}.`
              });
            }
          } else {
            // Fallback to algorithm if AI analysis fails
            toast({
              title: "Light measured successfully!",
              description: `Detected ${level.name} (${estimatedLux} lux) - ideal for ${level.suitable}.`
            });
          }
        } catch (error) {
          console.error('Error in OpenAI light analysis:', error);
          // Fallback to algorithm in case of error
          toast({
            title: "Light measured successfully!",
            description: `Detected ${level.name} (${estimatedLux} lux) - ideal for ${level.suitable}.`
          });
        }
      } catch (error) {
        console.error('Error processing image:', error);
        setErrorMessage('Could not analyze image. Please try again with a different image.');
        setCapturedImage(null);
      } finally {
        setIsProcessing(false);
      }
    };
    
    img.onerror = () => {
      console.error('Error loading image');
      setErrorMessage('Failed to load image. Please try again with a different image.');
      setIsProcessing(false);
      setCapturedImage(null);
    };
    
    // Set the image source to the data URL
    img.src = imageDataUrl;
  };
  
  // Reset everything for a new reading
  const resetMeasurement = () => {
    setCapturedImage(null);
    setLightValue(null);
    setCurrentLevel(null);
    setErrorMessage(null);
    setIsCameraView(false);
    
    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      {errorMessage && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4 mb-4">
          <p className="text-sm text-red-700 dark:text-red-400">{errorMessage}</p>
        </div>
      )}
      
      {/* Camera view */}
      {isCameraView && (
        <div className="relative w-full rounded-lg overflow-hidden mb-4">
          <div className="relative aspect-video bg-neutral-medium bg-opacity-30 dark:bg-neutral-dark dark:bg-opacity-50">
            <video 
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover"
              autoPlay 
              playsInline 
              muted
              disablePictureInPicture
            />
            
            <div className="absolute inset-x-0 top-0 p-2 flex justify-end">
              <button 
                onClick={closeCameraView}
                className="p-1 rounded-full bg-neutral-dark bg-opacity-40 text-white"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="absolute inset-x-0 bottom-0 p-4 flex justify-center">
              <Button
                onClick={captureImageFromCamera}
                className="bg-white text-neutral-dark hover:bg-neutral-light"
                size="lg"
              >
                <CameraIcon className="h-6 w-6" />
              </Button>
            </div>
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}
      
      {/* Initial state or results display */}
      {!isCameraView && (
        <div className="space-y-4">
          {/* Show upload options when no image is selected */}
          {!capturedImage && !isProcessing && (
            <Card className="p-6 bg-white dark:bg-neutral-dark border-0 shadow-md">
              <h3 className="text-lg font-medium mb-4 text-center">Measure Light Levels</h3>
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                <Button 
                  onClick={() => {
                    // Create a temporary file input for camera capture
                    const cameraInput = document.createElement('input');
                    cameraInput.type = 'file';
                    cameraInput.accept = 'image/*';
                    cameraInput.capture = 'environment'; // This forces camera on supported devices
                    cameraInput.style.display = 'none';
                    
                    // Add to DOM, trigger click, then clean up
                    document.body.appendChild(cameraInput);
                    
                    // Handle the file selection
                    cameraInput.addEventListener('change', async (e) => {
                      const target = e.target as HTMLInputElement;
                      if (target.files && target.files[0]) {
                        const file = target.files[0];
                        const reader = new FileReader();
                        reader.onload = async (event) => {
                          if (event.target?.result) {
                            setCapturedImage(event.target.result as string);
                            await processImageForLight(event.target.result as string);
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                      
                      // Clean up
                      document.body.removeChild(cameraInput);
                    });
                    
                    cameraInput.click();
                  }}
                  className="flex items-center justify-center gap-2 h-32 bg-primary/10 hover:bg-primary/20 text-primary-foreground border-2 border-dashed border-neutral-medium"
                  variant="outline"
                >
                  <CameraIcon className="h-6 w-6" />
                  <span className="font-medium">Take Photo</span>
                </Button>
                
                <Button 
                  onClick={handleUploadClick}
                  className="flex items-center justify-center gap-2 h-32 bg-primary/10 hover:bg-primary/20 text-primary-foreground border-2 border-dashed border-neutral-medium"
                  variant="outline"
                >
                  <Upload className="h-6 w-6" />
                  <span className="font-medium">Upload Photo</span>
                </Button>
                
                <input 
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
              </div>
            </Card>
          )}
          
          {/* Show processing indicator while analyzing */}
          {isProcessing && (
            <div className="text-center p-6 space-y-4">
              <Progress value={66} className="h-2" />
              <p className="text-sm text-neutral-dark dark:text-neutral-light">
                Measuring light level... This may take a moment.
              </p>
            </div>
          )}
          
          {/* Show results if available */}
          {capturedImage && currentLevel && lightValue !== null && !isProcessing && (
            <div className="space-y-4">
              <div className="aspect-video rounded-lg overflow-hidden bg-neutral-medium bg-opacity-30 dark:bg-neutral-dark">
                <img 
                  src={capturedImage} 
                  alt="Captured light reading" 
                  className="w-full h-full object-cover"
                />
              </div>
              
              <Card className="p-5 overflow-hidden dark:bg-neutral-dark/50">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                  <div>
                    <h3 className="text-xl font-semibold">{currentLevel.name}</h3>
                    <p className="text-sm text-neutral-dark dark:text-neutral-light">{lightValue} lux</p>
                    <p className="text-sm mt-1">{currentLevel.description}</p>
                  </div>
                  <SunIcon className="w-10 h-10 text-yellow-500 self-start sm:self-center" />
                </div>
                
                <div className="mt-4">
                  <h4 className="font-medium mb-2">Suitable Plants:</h4>
                  <div className="p-3 bg-neutral-medium bg-opacity-20 dark:bg-neutral-dark/40 rounded-lg">
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
      )}
    </div>
  );
}