import React from "react";
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
import { CameraIcon } from "@/lib/icons";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { insertPlantSchema } from "@shared/schema";
import { toast } from "@/hooks/use-toast";
import { type PlantWithCare } from "@shared/schema";

interface AddPlantModalProps {
  isOpen: boolean;
  onClose: () => void;
  plantToEdit?: PlantWithCare | null;
}

export function AddPlantModal({ isOpen, onClose, plantToEdit }: AddPlantModalProps) {
  // Extend the insertPlantSchema with client-side validation
  const formSchema = insertPlantSchema.extend({
    name: z.string().min(2, "Plant name must be at least 2 characters."),
    location: z.string().min(2, "Location must be at least 2 characters."),
    type: z.string().min(1, "Please select a plant type."),
    sunlightLevel: z.string().min(1, "Please select a sunlight level."),
    waterFrequency: z.coerce.number().min(1, "Water frequency must be at least 1 day."),
    fertilizerFrequency: z.coerce.number().min(0, "Fertilizer frequency must be 0 or more days."),
  });

  // Create form with defaultValues
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: plantToEdit ? {
      ...plantToEdit,
      // Make sure numbers are numbers, not strings
      waterFrequency: Number(plantToEdit.waterFrequency),
      fertilizerFrequency: Number(plantToEdit.fertilizerFrequency),
    } : {
      name: "",
      type: "",
      location: "",
      sunlightLevel: "medium",
      waterFrequency: 7,
      fertilizerFrequency: 30,
      notes: "",
      image: "",
      userId: 1, // For demo purpose
      status: "healthy",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      if (plantToEdit) {
        // Update existing plant
        await apiRequest('PATCH', `/api/plants/${plantToEdit.id}`, values);
        toast({
          title: "Plant updated",
          description: `${values.name} has been updated successfully.`,
        });
      } else {
        // Create new plant
        await apiRequest('POST', '/api/plants', values);
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
                <div className="h-44 bg-neutral-medium bg-opacity-30 rounded-lg flex flex-col items-center justify-center cursor-pointer">
                  <CameraIcon className="h-8 w-8 text-neutral-dark opacity-60 mb-2" />
                  <p className="text-sm text-neutral-dark opacity-70">Add a photo of your plant</p>
                </div>
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

              {/* Plant Type */}
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plant Type</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select plant type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {plantTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
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
                        {...field} 
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
