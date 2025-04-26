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
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
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
    reader.onload = (e) => {
      const imageDataUrl = e.target?.result as string;
      setCapturedImage(imageDataUrl);
      processImageForLight(imageDataUrl);
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
  const captureImageFromCamera = () => {
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
      processImageForLight(imageDataUrl);
    } catch (error) {
      console.error('Error capturing image:', error);
      setErrorMessage('Failed to capture image. Please try again.');
    }
  };
  
  // Process image to measure light
  const processImageForLight = (imageDataUrl: string) => {
    setIsProcessing(true);
    setErrorMessage(null);
    
    // Create a temporary image element to load the image
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    
    img.onload = () => {
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
        
        // Calculate average brightness and convert to lux estimation
        const averageBrightness = totalBrightness / pixelCount;
        const estimatedLux = Math.round(averageBrightness * 100);
        
        // Find the corresponding light level
        const level = LIGHT_LEVELS.find(level => 
          estimatedLux >= level.range[0] && estimatedLux <= level.range[1]
        ) || LIGHT_LEVELS[LIGHT_LEVELS.length - 1];
        
        console.log(`Measured light level: ${estimatedLux} lux (${level.name})`);
        
        // Update state with results
        setLightValue(estimatedLux);
        setCurrentLevel(level);
        
        toast({
          title: "Light measured successfully!",
          description: `Detected ${level.name} (${estimatedLux} lux) - ideal for ${level.suitable}.`
        });
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
                    cameraInput.addEventListener('change', (e) => {
                      const target = e.target as HTMLInputElement;
                      if (target.files && target.files[0]) {
                        const file = target.files[0];
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          if (event.target?.result) {
                            setCapturedImage(event.target.result as string);
                            processImageForLight(event.target.result as string);
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