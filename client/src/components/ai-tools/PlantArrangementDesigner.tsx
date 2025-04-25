import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Brain, PanelTop, Leaf, Grid2X2, Users } from "lucide-react";
import { apiRequest } from '@/lib/queryClient';
import { PlantWithCare } from '@shared/schema';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

// Interface for the OpenAI response
interface ArrangementSuggestion {
  recommendations: {
    grouping: string;
    placement: string;
    aesthetics: string;
    careConsiderations: string;
  };
  plantGroups: {
    name: string;
    plants: string[];
    location: string;
    notes: string;
  }[];
  visualDescription: string;
}

// Form schema
const arrangementSchema = z.object({
  spaceType: z.string({
    required_error: "Please select a space type",
  }),
  spaceSize: z.string({
    required_error: "Please select a space size",
  }),
  selectedPlants: z.array(z.string()).min(1, {
    message: "Please select at least one plant",
  }),
  additionalNotes: z.string().optional(),
});

type ArrangementFormValues = z.infer<typeof arrangementSchema>;

export function PlantArrangementDesigner() {
  const { toast } = useToast();
  const [arrangement, setArrangement] = useState<ArrangementSuggestion | null>(null);
  
  // Query to get user's plants
  const { data: plants, isLoading: isPlantsLoading } = useQuery<PlantWithCare[]>({
    queryKey: ['/api/plants'],
  });
  
  // Form
  const form = useForm<ArrangementFormValues>({
    resolver: zodResolver(arrangementSchema),
    defaultValues: {
      spaceType: "",
      spaceSize: "",
      selectedPlants: [],
      additionalNotes: "",
    },
  });
  
  // Mutation to get arrangement suggestions
  const arrangementMutation = useMutation({
    mutationFn: async (data: ArrangementFormValues) => {
      const payload = {
        spaceType: data.spaceType,
        spaceSize: data.spaceSize,
        plantIds: data.selectedPlants.map(id => parseInt(id)),
        additionalNotes: data.additionalNotes,
      };
      
      const res = await apiRequest(
        "POST", 
        "/api/ai/arrangement-suggestions", 
        payload
      );
      return res.json();
    },
    onSuccess: (data: ArrangementSuggestion) => {
      setArrangement(data);
      toast({
        title: "Plant arrangement suggestions generated",
        description: "Your arrangement suggestions are ready!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to generate arrangement suggestions",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = (values: ArrangementFormValues) => {
    arrangementMutation.mutate(values);
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <PanelTop className="mr-2 h-5 w-5 text-teal-500" />
            Plant Arrangement Designer
          </CardTitle>
          <CardDescription>
            Get AI-powered suggestions for arranging your plants aesthetically and functionally
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="spaceType"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Space Type</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1"
                        >
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="living room" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Living Room
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="kitchen" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Kitchen
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="bedroom" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Bedroom
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="bathroom" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Bathroom
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="office" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Office
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="balcony" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Balcony/Patio
                            </FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="spaceSize"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Space Size</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1"
                        >
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="small" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Small
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="medium" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Medium
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="large" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Large
                            </FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="additionalNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe any specific requirements or preferences for your space arrangement..." 
                        className="resize-none" 
                        rows={3}
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Mention any specific goals, challenges, or design preferences
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="space-y-3">
                <FormField
                  control={form.control}
                  name="selectedPlants"
                  render={() => (
                    <FormItem>
                      <div className="mb-4">
                        <FormLabel className="text-base">Select Plants to Arrange</FormLabel>
                        <FormDescription>
                          Choose the plants you want to include in your arrangement
                        </FormDescription>
                      </div>
                      <div className="space-y-4">
                        {isPlantsLoading ? (
                          <div className="p-4 border rounded-md text-center space-y-2">
                            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                            <p className="text-sm text-muted-foreground">Loading your plants...</p>
                          </div>
                        ) : !plants || plants.length === 0 ? (
                          <Alert variant="destructive">
                            <AlertTitle>No plants found</AlertTitle>
                            <AlertDescription>
                              Please add plants to your collection before creating an arrangement.
                            </AlertDescription>
                          </Alert>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {plants.map((plant) => (
                              <FormField
                                key={plant.id}
                                control={form.control}
                                name="selectedPlants"
                                render={({ field }) => {
                                  return (
                                    <FormItem
                                      key={plant.id}
                                      className="flex flex-row items-start space-x-3 space-y-0 p-2 border rounded-md"
                                    >
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value?.includes(plant.id.toString())}
                                          onCheckedChange={(checked) => {
                                            return checked
                                              ? field.onChange([...field.value, plant.id.toString()])
                                              : field.onChange(
                                                  field.value?.filter(
                                                    (value) => value !== plant.id.toString()
                                                  )
                                                )
                                          }}
                                        />
                                      </FormControl>
                                      <div className="flex gap-2 items-center leading-none">
                                        <Leaf className="h-4 w-4 text-green-500" />
                                        <div className="space-y-1">
                                          <FormLabel className="font-medium text-sm">
                                            {plant.name}
                                          </FormLabel>
                                          {plant.type && (
                                            <p className="text-xs text-muted-foreground">
                                              {plant.type}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    </FormItem>
                                  )
                                }}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full"
                disabled={arrangementMutation.isPending || !plants || plants.length === 0}
              >
                {arrangementMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Arrangement...
                  </>
                ) : (
                  <>Generate Plant Arrangement</>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      {arrangement && (
        <Card className="border-teal-200">
          <CardHeader className="bg-teal-50">
            <CardTitle className="flex items-center">
              <PanelTop className="mr-2 h-5 w-5 text-teal-500" />
              Plant Arrangement Suggestions
            </CardTitle>
            <CardDescription>
              Aesthetic and functional arrangement ideas for your plants
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-6">
              <Tabs defaultValue="visualization" className="w-full">
                <TabsList className="w-full justify-start">
                  <TabsTrigger value="visualization">
                    <Grid2X2 className="h-4 w-4 mr-2" />
                    Visualization
                  </TabsTrigger>
                  <TabsTrigger value="recommendations">
                    <Brain className="h-4 w-4 mr-2" />
                    Recommendations
                  </TabsTrigger>
                  <TabsTrigger value="plantGroups">
                    <Users className="h-4 w-4 mr-2" />
                    Plant Groups
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="visualization" className="pt-4">
                  <Card className="bg-teal-50/50 border-teal-100">
                    <CardContent className="p-6">
                      <h3 className="text-lg font-medium mb-2 text-teal-800">Visual Description</h3>
                      <p className="text-teal-700 whitespace-pre-line">{arrangement.visualDescription}</p>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="recommendations" className="pt-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Grouping Strategy</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm">{arrangement.recommendations.grouping}</p>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Placement Strategy</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm">{arrangement.recommendations.placement}</p>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Aesthetic Considerations</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm">{arrangement.recommendations.aesthetics}</p>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Care Considerations</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm">{arrangement.recommendations.careConsiderations}</p>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
                
                <TabsContent value="plantGroups" className="pt-4">
                  <div className="space-y-4">
                    {arrangement.plantGroups.map((group, index) => (
                      <Card key={index} className="border-teal-100">
                        <CardHeader className="bg-teal-50/50 pb-2">
                          <CardTitle className="text-base">{group.name}</CardTitle>
                          <CardDescription>{group.location}</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-4">
                          <div className="space-y-3">
                            <div className="flex flex-wrap gap-2">
                              {group.plants.map((plant, pIndex) => (
                                <div key={pIndex} className="px-2 py-1 bg-teal-100 rounded-md text-xs flex items-center">
                                  <Leaf className="h-3 w-3 mr-1 text-teal-600" />
                                  {plant}
                                </div>
                              ))}
                            </div>
                            <p className="text-sm mt-2">{group.notes}</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </CardContent>
          <CardFooter className="bg-teal-50 flex justify-center border-t border-teal-100">
            <p className="text-sm text-teal-700 flex items-center">
              <Brain className="mr-2 h-4 w-4" />
              AI-powered arrangement suggestions powered by OpenAI
            </p>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}