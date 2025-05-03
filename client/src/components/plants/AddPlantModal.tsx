import React, { useState, useRef } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CameraIcon, LeafIcon } from "@/lib/icons";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { insertPlantSchema } from "@shared/schema";
import { toast } from "@/hooks/use-toast";
import { type PlantWithCare } from "@shared/schema";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { compressImage, formatFileSize } from "@/lib/utils";

interface AddPlantModalProps {
  isOpen: boolean;
  onClose: () => void;
  plantToEdit?: PlantWithCare | null;
}

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

export function AddPlantModal({ isOpen, onClose, plantToEdit }: AddPlantModalProps) {
  // State for image upload and identification
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [identificationResult, setIdentificationResult] = useState<PlantIdentificationResult | null>(null);
  const [usingAiCareRecommendations, setUsingAiCareRecommendations] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Extend the insertPlantSchema with client-side validation
  const formSchema = insertPlantSchema.extend({
    name: z.string().min(2, "Plant name must be at least 2 characters."),
    location: z.string().min(2, "Location must be at least 2 characters."),
    type: z.string().optional().default("identified"), // No longer required, using scientificName instead
    scientificName: z.string().nullable().optional(),
    sunlightLevel: z.string().min(1, "Please select a sunlight level."),
    waterFrequency: z.coerce.number().min(1, "Water frequency must be at least 1 day."),
    fertilizerFrequency: z.coerce.number().min(0, "Fertilizer frequency must be 0 or more days."),
  });

  // Create form with defaultValues
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: plantToEdit ? {
      name: plantToEdit.name,
      type: plantToEdit.type || "identified", // Ensure type is always a string
      location: plantToEdit.location,
      scientificName: plantToEdit.scientificName,
      sunlightLevel: plantToEdit.sunlightLevel,
      waterFrequency: Number(plantToEdit.waterFrequency),
      fertilizerFrequency: Number(plantToEdit.fertilizerFrequency),
      notes: plantToEdit.notes,
      image: plantToEdit.image,
      userId: plantToEdit.userId,
      status: plantToEdit.status || "healthy",
      lastWatered: plantToEdit.lastWatered,
      lastFertilized: plantToEdit.lastFertilized
    } : {
      name: "",
      type: "identified", // Default value, as plant type is now optional
      location: "",
      scientificName: "",
      sunlightLevel: "medium",
      waterFrequency: 7,
      fertilizerFrequency: 30,
      notes: "",
      image: null,
      userId: 1, // Will be set on the server
      status: "healthy",
    },
  });

  // State for tracking compression progress
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionStats, setCompressionStats] = useState<{original: number, compressed: number} | null>(null);
  
  // Handle image file selection
  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      try {
        const file = event.target.files[0];
        setImageFile(file);
        
        // Check file size - warn if over 4MB
        if (file.size > 4 * 1024 * 1024) {
          toast({
            title: "Large image detected",
            description: "Image will be compressed to optimize upload performance.",
          });
        }
        
        // Reset identification result and AI recommendations when new image is selected
        setIdentificationResult(null);
        setUsingAiCareRecommendations(false);
        
        // Create a preview URL
        const reader = new FileReader();
        reader.onload = async (e) => {
          if (e.target?.result) {
            const originalImage = e.target.result as string;
            setSelectedImage(originalImage); // Show the original image immediately as preview
            
            // Start compression if file is large
            if (file.size > 1 * 1024 * 1024) { // > 1MB
              setIsCompressing(true);
              try {
                // Compress the image
                const compressedImage = await compressImage(originalImage);
                
                // Update compression stats
                const originalSize = originalImage.length;
                const compressedSize = compressedImage.length;
                setCompressionStats({
                  original: originalSize,
                  compressed: compressedSize
                });
                
                // Store the compressed image in form data
                form.setValue("image", compressedImage);
                setSelectedImage(compressedImage);
                
                // Show success message if compression was significant
                if (compressedSize < originalSize * 0.8) { // At least 20% reduction
                  toast({
                    title: "Image optimized",
                    description: `Reduced from ${formatFileSize(originalSize)} to ${formatFileSize(compressedSize)}`,
                  });
                }
              } catch (error) {
                console.error("Compression failed:", error);
                // Fall back to original image if compression fails
                form.setValue("image", originalImage);
              } finally {
                setIsCompressing(false);
              }
            } else {
              // For small images, use original without compression
              form.setValue("image", originalImage);
            }
          }
        };
        reader.readAsDataURL(file);
      } catch (error) {
        console.error("Error processing image:", error);
        toast({
          title: "Image processing failed",
          description: "Please try another image or a different format.",
          variant: "destructive"
        });
      }
    }
  };

  // Open file selector for choosing photos
  const handleImageClick = () => {
    // Standard file picker with no capture attribute
    if (fileInputRef.current) {
      fileInputRef.current.removeAttribute('capture');
      fileInputRef.current.click();
    }
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
      
      // Pre-fill the form with the identification results
      if (result.commonName) {
        form.setValue("name", result.commonName);
      }
      
      // Always set a plant type, defaulting to "other" if not recognized
      const plantType = result.plantType ? result.plantType.toLowerCase() : "other";
      form.setValue("type", plantType);
      
      if (result.careRecommendations) {
        // Set sunlight level
        if (result.careRecommendations.sunlightLevel) {
          form.setValue("sunlightLevel", result.careRecommendations.sunlightLevel);
        }
        
        // Set water frequency
        if (result.careRecommendations.waterFrequency) {
          form.setValue("waterFrequency", result.careRecommendations.waterFrequency);
        }
        
        // Set fertilizer frequency
        if (result.careRecommendations.fertilizerFrequency) {
          form.setValue("fertilizerFrequency", result.careRecommendations.fertilizerFrequency);
        }
        
        // Set the scientific name field directly
        if (result.scientificName) {
          form.setValue("scientificName", result.scientificName);
        }
        
        // Add care tips to notes
        const existingNotes = form.getValues("notes") || "";
        const newNotes = `Care Tips: ${result.careRecommendations.additionalCare || 'No specific care tips available.'}${existingNotes ? "\n\n" + existingNotes : ""}`;
        form.setValue("notes", newNotes);
        
        // Set the AI recommendations flag to make fields read-only
        setUsingAiCareRecommendations(true);
      }
      
      toast({
        title: "Plant identified!",
        description: `Identified as ${result.commonName || 'Unknown plant'} with ${result.confidence || 'unknown'} confidence.`
      });
    } catch (error) {
      console.error("Error identifying plant:", error);
      let errorMessage = "We couldn't identify your plant at this time.";
      let actionSuggestion = "You can still add your plant manually.";
      
      if (error instanceof Error) {
        if (error.message.includes("entity too large")) {
          errorMessage = "Your image is too large for our identification service.";
          actionSuggestion = "Try using the optimization feature or selecting a smaller image.";
        } else if (error.message.includes("NetworkError") || error.message.includes("Failed to fetch")) {
          errorMessage = "We couldn't connect to our identification service.";
          actionSuggestion = "Please check your internet connection and try again.";
        } else if (error.message.includes("timeout")) {
          errorMessage = "The identification process took too long.";
          actionSuggestion = "Try with a smaller image or at a less busy time.";
        } else if (error.message.includes("429") || error.message.includes("rate limit")) {
          errorMessage = "Our identification service is currently very busy.";
          actionSuggestion = "Please wait a few minutes and try again.";
        } else if (error.message.includes("500") || error.message.includes("503")) {
          errorMessage = "Our identification service is temporarily unavailable.";
          actionSuggestion = "Please try again later.";
        }
      }
      
      toast({
        title: "Plant Identification",
        description: (
          <div className="space-y-1">
            <p>{errorMessage}</p>
            <p className="text-sm opacity-90">{actionSuggestion}</p>
          </div>
        ),
        variant: "destructive"
      });
    } finally {
      setIsIdentifying(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      // Convert values to match expected API format
      const submissionData = {
        ...values,
        // Ensure the right types for the backend
        scientificName: values.scientificName || null
      };
      
      if (plantToEdit) {
        // Update existing plant
        await apiRequest('PATCH', `/api/plants/${plantToEdit.id}`, submissionData);
        toast({
          title: "Plant updated",
          description: `${values.name} has been updated successfully.`,
        });
      } else {
        // Create new plant
        await apiRequest('POST', '/api/plants', submissionData);
        toast({
          title: "Plant added",
          description: `${values.name} has been added to your garden.`,
        });
      }
      
      // Refresh plant list
      queryClient.invalidateQueries({ queryKey: ['/api/plants'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/care-needed'] });
      
      // Reset form and close modal
      form.reset();
      setSelectedImage(null);
      setImageFile(null);
      setIdentificationResult(null);
      setUsingAiCareRecommendations(false);
      onClose();
    } catch (error) {
      console.error(`Error ${plantToEdit ? 'updating' : 'adding'} plant:`, error);
      
      let errorMessage = `We couldn't ${plantToEdit ? 'save your changes' : 'add your plant'} at this time.`;
      let actionSuggestion = "Please try again in a moment.";
      
      if (error instanceof Error) {
        if (error.message.includes("NetworkError") || error.message.includes("Failed to fetch")) {
          errorMessage = "We couldn't connect to our server.";
          actionSuggestion = "Please check your internet connection and try again.";
        } else if (error.message.includes("timeout")) {
          errorMessage = "The request took too long to complete.";
          actionSuggestion = "Please try again when your connection is better.";
        } else if (error.message.includes("401") || error.message.includes("auth")) {
          errorMessage = "Your session may have expired.";
          actionSuggestion = "Please refresh the page and try again.";
        }
      }
      
      toast({
        title: plantToEdit ? "Update Failed" : "Adding Plant Failed",
        description: (
          <div className="space-y-1">
            <p>{errorMessage}</p>
            <p className="text-sm opacity-90">{actionSuggestion}</p>
          </div>
        ),
        variant: "destructive"
      });
    }
  };

  const plantTypes = [
    { value: "tropical", label: "Tropical" },
    { value: "succulent", label: "Succulent" },
    { value: "herb", label: "Herb" },
    { value: "flowering", label: "Flowering" },
    { value: "fern", label: "Fern" },
    { value: "other", label: "Other" }
  ];

  const sunlightLevels = [
    { value: "low", label: "Low" },
    { value: "medium", label: "Medium" },
    { value: "high", label: "High" }
  ];

  const waterFrequencies = [
    { value: "3", label: "Every 3 days" },
    { value: "7", label: "Every 7 days" },
    { value: "14", label: "Every 14 days" },
    { value: "21", label: "Every 21 days" },
    { value: "30", label: "Monthly" }
  ];

  const fertilizerFrequencies = [
    { value: "14", label: "Every 2 weeks" },
    { value: "30", label: "Monthly" },
    { value: "60", label: "Every 2 months" },
    { value: "90", label: "Quarterly" },
    { value: "0", label: "No fertilization" }
  ];

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // If Escape is pressed, close the modal (this is built-in for Dialog but adding for clarity)
    if (e.key === 'Escape') {
      onClose();
    }
    // If Enter is pressed in a field but not inside a textarea, submit the form
    if (e.key === 'Enter' && e.target instanceof HTMLInputElement && e.target.type !== 'textarea') {
      e.preventDefault();
      form.handleSubmit(onSubmit)();
    }
  };

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={(open) => {
        if (!open) {
          setUsingAiCareRecommendations(false);
          onClose();
        }
      }}
    >
      <DialogContent 
        className="max-w-md mx-auto p-0 rounded-t-xl sm:rounded-lg max-h-[90vh] overflow-y-auto" 
        onKeyDown={handleKeyDown}
        onInteractOutside={(e) => {
          // Only close if not in the middle of filling out the form
          if (!isIdentifying) {
            onClose();
          } else {
            e.preventDefault(); // Prevent closing during identification
          }
        }}
      >
        <DialogHeader className="p-4 border-b border-neutral-medium">
          <DialogTitle className="text-lg font-medium">
            {plantToEdit ? "Edit Plant" : "Add New Plant"}
          </DialogTitle>
        </DialogHeader>
        
        <div className="p-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Plant Image Upload */}
              <div className="mb-4">
                {/* File input for selecting photos */}
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
                      
                      {/* Compression indicator overlay */}
                      {isCompressing && (
                        <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center">
                          <div className="text-center">
                            <svg className="animate-spin h-8 w-8 text-primary mx-auto mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <p className="text-sm text-white">Optimizing image...</p>
                          </div>
                        </div>
                      )}
                      
                      {/* Hover controls for changing photo */}
                      <div 
                        className={`absolute inset-0 bg-black bg-opacity-60 flex flex-col items-center justify-center ${isCompressing ? 'hidden' : 'opacity-0 hover:opacity-100 transition-opacity'}`}>
                        <p className="text-sm text-white mb-4">Change photo</p>
                        <div className="flex gap-3">
                          <button 
                            onClick={(e) => {
                              e.preventDefault();
                              if (fileInputRef.current) {
                                fileInputRef.current.removeAttribute('capture');
                                fileInputRef.current.click();
                              }
                            }}
                            className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-3 py-2 rounded-md text-sm flex items-center gap-1"
                            disabled={isCompressing}
                          >
                            <svg 
                              xmlns="http://www.w3.org/2000/svg" 
                              className="h-4 w-4" 
                              viewBox="0 0 24 24" 
                              fill="none" 
                              stroke="currentColor" 
                              strokeWidth="2" 
                              strokeLinecap="round" 
                              strokeLinejoin="round"
                            >
                              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                              <circle cx="8.5" cy="8.5" r="1.5" />
                              <polyline points="21 15 16 10 5 21" />
                            </svg>
                            Gallery
                          </button>
                          <button 
                            onClick={(e) => {
                              e.preventDefault();
                              if (fileInputRef.current) {
                                fileInputRef.current.setAttribute('capture', 'environment');
                                fileInputRef.current.click();
                              }
                            }}
                            className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-3 py-2 rounded-md text-sm flex items-center gap-1"
                            disabled={isCompressing}
                          >
                            <CameraIcon className="h-4 w-4" />
                            Camera
                          </button>
                        </div>
                      </div>
                      
                      {/* Show compression stats if available */}
                      {compressionStats && compressionStats.compressed < compressionStats.original * 0.9 && (
                        <div className="absolute bottom-0 left-0 right-0 bg-green-700 bg-opacity-90 text-white text-xs px-2 py-1 flex justify-between">
                          <span>Optimized</span>
                          <span>{Math.round((1 - compressionStats.compressed/compressionStats.original) * 100)}% smaller</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    <div 
                      className="h-56 bg-neutral-medium bg-opacity-30 rounded-lg flex flex-col items-center justify-center cursor-pointer relative overflow-hidden mb-3"
                    >
                      <div className="mb-2">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-16 w-16 text-neutral-dark opacity-50"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7" />
                          <line x1="16" y1="5" x2="22" y2="5" />
                          <line x1="19" y1="2" x2="19" y2="8" />
                          <circle cx="9" cy="9" r="2" />
                          <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                        </svg>
                      </div>
                      <p className="text-neutral-dark opacity-70">Add plant photo</p>
                      <p className="text-neutral-dark opacity-50 text-sm mt-1">Use the buttons below to choose a method</p>
                    </div>
                    
                    <div className="flex justify-center gap-3 mb-3">
                      <Button
                        type="button"
                        onClick={() => {
                          if (fileInputRef.current) {
                            fileInputRef.current.removeAttribute('capture');
                            fileInputRef.current.click();
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            if (fileInputRef.current) {
                              fileInputRef.current.removeAttribute('capture');
                              fileInputRef.current.click();
                            }
                          }
                        }}
                        aria-label="Select image from gallery"
                        variant="outline"
                        className="flex items-center gap-2"
                      >
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          className="h-5 w-5" 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth="2" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <polyline points="21 15 16 10 5 21" />
                        </svg>
                        Gallery
                      </Button>
                      <Button
                        type="button"
                        onClick={() => {
                          if (fileInputRef.current) {
                            fileInputRef.current.setAttribute('capture', 'environment');
                            fileInputRef.current.click();
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            if (fileInputRef.current) {
                              fileInputRef.current.setAttribute('capture', 'environment');
                              fileInputRef.current.click();
                            }
                          }
                        }}
                        aria-label="Take photo with camera"
                        variant="outline"
                        className="flex items-center gap-2"
                      >
                        <CameraIcon className="h-5 w-5" aria-hidden="true" />
                        Camera
                      </Button>
                    </div>
                  </>
                )}
                
                {selectedImage && !isIdentifying && !identificationResult && (
                  <div className="mt-4 flex justify-center">
                    <Button 
                      type="button" 
                      onClick={identifyPlant}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          identifyPlant();
                        }
                      }}
                      aria-label="Identify plant from uploaded image"
                      size="lg"
                      className="flex items-center gap-2"
                    >
                      <LeafIcon className="h-5 w-5" aria-hidden="true" />
                      Identify Plant
                    </Button>
                  </div>
                )}
                
                {isIdentifying && (
                  <div className="mt-3 space-y-2">
                    <Progress value={66} className="h-2" />
                    <p className="text-xs text-center text-neutral-dark">Identifying your plant...</p>
                  </div>
                )}
                
                {identificationResult && (
                  <div className="mt-2 p-2 bg-primary/10 rounded-md">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium">{identificationResult.commonName}</p>
                        <p className="text-xs text-neutral-dark italic">{identificationResult.scientificName}</p>
                      </div>
                      <Badge variant={
                        identificationResult.confidence === "high" ? "default" : 
                        identificationResult.confidence === "medium" ? "outline" : "secondary"
                      }>
                        {identificationResult.confidence} confidence
                      </Badge>
                    </div>
                  </div>
                )}
              </div>

              {/* Plant Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plant Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., Monstera Deliciosa" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Hidden Plant Type - automatically set from identification */}
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <input type="hidden" {...field} />
                )}
              />
              
              {/* Scientific Name - important field for identification */}
              <FormField
                control={form.control}
                name="scientificName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Scientific Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., Monstera deliciosa" 
                        {...field} 
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                    {!field.value && identificationResult && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Scientific name will be filled automatically when you identify a plant.
                      </p>
                    )}
                  </FormItem>
                )}
              />

              {/* Location */}
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., Living Room" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Care Schedule */}
              <div className="mb-2">
                <h3 className="font-medium mb-3">Care Schedule</h3>
                
                {/* Water Frequency */}
                <FormField
                  control={form.control}
                  name="waterFrequency"
                  render={({ field }) => (
                    <FormItem className="mb-3">
                      <FormLabel>
                        Water Frequency
                        {usingAiCareRecommendations && (
                          <Badge variant="outline" className="ml-2 bg-primary/10 text-xs">
                            AI Recommended
                          </Badge>
                        )}
                      </FormLabel>
                      {usingAiCareRecommendations ? (
                        <div className="flex items-center p-2.5 px-3 bg-muted/30 border rounded-md text-sm">
                          Every {field.value} days
                          {identificationResult?.confidence && (
                            <Badge variant="outline" className="ml-auto text-xs" title={`AI confidence: ${identificationResult.confidence}`}>
                              {identificationResult.confidence === "high" ? "High confidence" : 
                               identificationResult.confidence === "medium" ? "Medium confidence" : "Low confidence"}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <Select 
                          onValueChange={(value) => field.onChange(parseInt(value))} 
                          defaultValue={field.value.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select water frequency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {waterFrequencies.map((freq) => (
                              <SelectItem key={freq.value} value={freq.value}>
                                {freq.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Sunlight Requirement */}
                <FormField
                  control={form.control}
                  name="sunlightLevel"
                  render={({ field }) => (
                    <FormItem className="mb-3">
                      <FormLabel>
                        Sunlight Requirement
                        {usingAiCareRecommendations && (
                          <Badge variant="outline" className="ml-2 bg-primary/10 text-xs">
                            AI Recommended
                          </Badge>
                        )}
                      </FormLabel>
                      {usingAiCareRecommendations ? (
                        <div className="flex items-center p-2.5 px-3 bg-muted/30 border rounded-md text-sm">
                          {field.value.charAt(0).toUpperCase() + field.value.slice(1)} light
                          {identificationResult?.confidence && (
                            <Badge variant="outline" className="ml-auto text-xs" title={`AI confidence: ${identificationResult.confidence}`}>
                              {identificationResult.confidence === "high" ? "High confidence" : 
                               identificationResult.confidence === "medium" ? "Medium confidence" : "Low confidence"}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select sunlight level" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {sunlightLevels.map((level) => (
                              <SelectItem key={level.value} value={level.value}>
                                {level.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Fertilizer Frequency */}
                <FormField
                  control={form.control}
                  name="fertilizerFrequency"
                  render={({ field }) => (
                    <FormItem className="mb-3">
                      <FormLabel>
                        Fertilizer Frequency
                        {usingAiCareRecommendations && (
                          <Badge variant="outline" className="ml-2 bg-primary/10 text-xs">
                            AI Recommended
                          </Badge>
                        )}
                      </FormLabel>
                      {usingAiCareRecommendations ? (
                        <div className="flex items-center p-2.5 px-3 bg-muted/30 border rounded-md text-sm">
                          {field.value === 0 ? "No fertilization needed" : `Every ${field.value} days`}
                          {identificationResult?.confidence && (
                            <Badge variant="outline" className="ml-auto text-xs" title={`AI confidence: ${identificationResult.confidence}`}>
                              {identificationResult.confidence === "high" ? "High confidence" : 
                               identificationResult.confidence === "medium" ? "Medium confidence" : "Low confidence"}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <Select 
                          onValueChange={(value) => field.onChange(parseInt(value))} 
                          defaultValue={field.value.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select fertilizer frequency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {fertilizerFrequencies.map((freq) => (
                              <SelectItem key={freq.value} value={freq.value}>
                                {freq.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Additional Notes */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Add any special care instructions or notes about your plant" 
                        className="min-h-[100px]"
                        value={field.value || ''}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Submit Button */}
              <Button 
                type="submit" 
                className="w-full"
                aria-label={plantToEdit ? "Update plant details" : "Add plant to your collection"}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    form.handleSubmit(onSubmit)();
                  }
                }}
              >
                {plantToEdit ? "Update Plant" : "Add Plant"}
              </Button>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default AddPlantModal;
