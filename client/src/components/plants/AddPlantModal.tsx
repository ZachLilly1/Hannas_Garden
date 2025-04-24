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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Extend the insertPlantSchema with client-side validation
  const formSchema = insertPlantSchema.extend({
    name: z.string().min(2, "Plant name must be at least 2 characters."),
    location: z.string().min(2, "Location must be at least 2 characters."),
    type: z.string().min(1, "Please select a plant type."),
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
      type: plantToEdit.type,
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
      type: "",
      location: "",
      scientificName: null,
      sunlightLevel: "medium",
      waterFrequency: 7,
      fertilizerFrequency: 30,
      notes: "",
      image: null,
      userId: 1, // Will be set on the server
      status: "healthy",
    },
  });

  // Handle image file selection
  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setImageFile(file);
      
      // Reset identification result when new image is selected
      setIdentificationResult(null);
      
      // Create a preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setSelectedImage(e.target.result as string);
          // Store the image in form data
          form.setValue("image", e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Trigger file input click
  const handleImageClick = () => {
    // No longer forcing 'capture' attribute, allowing user to choose
    // between camera and gallery on mobile devices
    fileInputRef.current?.click();
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
      }
      
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
        description: errorMessage + " You can still fill in the details manually.",
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
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${plantToEdit ? 'update' : 'add'} plant. Please try again.`,
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto p-0 rounded-t-xl sm:rounded-lg max-h-[90vh] overflow-y-auto" onInteractOutside={onClose}>
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
                    
                    <div className="flex justify-center mb-3">
                      <Button
                        type="button"
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
                
                {selectedImage && !isIdentifying && !identificationResult && (
                  <div className="mt-4 flex justify-center">
                    <Button 
                      type="button" 
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
              
              {/* Scientific Name - hidden field that gets filled by identification */}
              <FormField
                control={form.control}
                name="scientificName"
                render={({ field }) => (
                  <input 
                    type="hidden" 
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    value={field.value || ''}
                    name={field.name}
                    ref={field.ref}
                  />
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
                      <FormLabel>Water Frequency</FormLabel>
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
                      <FormLabel>Sunlight Requirement</FormLabel>
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
                      <FormLabel>Fertilizer Frequency</FormLabel>
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
              <Button type="submit" className="w-full">
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
