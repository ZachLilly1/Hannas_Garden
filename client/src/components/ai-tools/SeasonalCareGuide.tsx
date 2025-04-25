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
import { Loader2, Brain, CloudSun, Leaf, Info } from "lucide-react";
import { apiRequest } from '@/lib/queryClient';
import { PlantWithCare } from '@shared/schema';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import type { SubmitHandler } from 'react-hook-form';

// Interface for seasonal care guide response from OpenAI
interface SeasonalCareGuide {
  season: string;
  generalRecommendations: string;
  plants: {
    name: string;
    scientificName: string;
    watering: string;
    light: string;
    fertilizing: string;
    pruning: string;
    specialCare: string;
  }[];
}

// Form schema
const seasonalGuideSchema = z.object({
  location: z.string().min(1, "Please enter your location"),
  season: z.string().optional(),
});

type SeasonalGuideFormValues = z.infer<typeof seasonalGuideSchema>;

export function SeasonalCareGuide() {
  const { toast } = useToast();
  const [careGuide, setCareGuide] = useState<SeasonalCareGuide | null>(null);
  
  // Query to get user's plants
  const { data: plants, isLoading: isPlantsLoading } = useQuery<PlantWithCare[]>({
    queryKey: ['/api/plants'],
  });
  
  // Form
  const form = useForm<SeasonalGuideFormValues>({
    resolver: zodResolver(seasonalGuideSchema),
    defaultValues: {
      location: "",
      season: "",
    },
  });
  
  // Mutation to get seasonal care guide
  const guideMutation = useMutation({
    mutationFn: async (data: SeasonalGuideFormValues) => {
      const res = await apiRequest(
        "POST", 
        "/api/ai/seasonal-recommendations", 
        {
          location: data.location,
          season: data.season || undefined,
          plantIds: plants?.map(p => p.id) || []
        }
      );
      return res.json();
    },
    onSuccess: (data: SeasonalCareGuide) => {
      setCareGuide(data);
      toast({
        title: "Seasonal care guide generated",
        description: `Your ${data.season} care guide is ready!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to generate seasonal care guide",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const onSubmit: SubmitHandler<SeasonalGuideFormValues> = (values) => {
    guideMutation.mutate(values);
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CloudSun className="mr-2 h-5 w-5 text-blue-500" />
            Seasonal Care Guide
          </CardTitle>
          <CardDescription>
            Get customized seasonal care recommendations for your plants based on location and time of year
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Location</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., New York, NY" {...field} />
                    </FormControl>
                    <FormDescription>
                      City, State or Country
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="season"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Season (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a season or leave blank for current season" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="spring">Spring</SelectItem>
                        <SelectItem value="summer">Summer</SelectItem>
                        <SelectItem value="fall">Fall</SelectItem>
                        <SelectItem value="winter">Winter</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Leave blank to use the current season for your location
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {isPlantsLoading ? (
                <div className="p-4 border rounded-md text-center space-y-2">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  <p className="text-sm text-muted-foreground">Loading your plants...</p>
                </div>
              ) : !plants || plants.length === 0 ? (
                <Alert variant="destructive">
                  <AlertTitle>No plants found</AlertTitle>
                  <AlertDescription>
                    Please add plants to your collection before generating a seasonal care guide.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="p-4 border rounded-md bg-muted/30">
                  <p className="text-sm font-medium mb-2">Plants that will be included ({plants.length}):</p>
                  <div className="flex flex-wrap gap-2">
                    {plants.map((plant) => (
                      <div key={plant.id} className="px-2 py-1 bg-primary/10 rounded-md text-xs flex items-center">
                        <Leaf className="h-3 w-3 mr-1 text-green-600" />
                        {plant.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <Button 
                type="submit" 
                className="w-full"
                disabled={guideMutation.isPending || !plants || plants.length === 0}
              >
                {guideMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Guide...
                  </>
                ) : (
                  <>Generate Seasonal Care Guide</>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      {careGuide && (
        <Card className="border-blue-200">
          <CardHeader className="bg-blue-50 dark:bg-blue-950">
            <CardTitle className="flex items-center">
              <CloudSun className="mr-2 h-5 w-5 text-blue-500 dark:text-blue-400" />
              {careGuide.season.charAt(0).toUpperCase() + careGuide.season.slice(1)} Care Guide
            </CardTitle>
            <CardDescription className="dark:text-blue-300/70">
              Seasonal recommendations for your plant collection
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-6">
              <div className="rounded-md border-l-4 border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/30 p-4">
                <p className="text-sm">{careGuide.generalRecommendations}</p>
              </div>
              
              <Tabs defaultValue="all" className="w-full">
                <TabsList className="w-full justify-start mb-4 overflow-auto">
                  <TabsTrigger value="all">All Plants</TabsTrigger>
                  {careGuide.plants.map((plant, index) => (
                    <TabsTrigger key={index} value={`plant-${index}`}>
                      {plant.name}
                    </TabsTrigger>
                  ))}
                </TabsList>
                
                <TabsContent value="all">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {careGuide.plants.map((plant, index) => (
                      <Card key={index} className="h-full border-blue-100 hover:border-blue-300 transition-colors">
                        <CardHeader className="p-4 pb-2">
                          <CardTitle className="text-base">{plant.name}</CardTitle>
                          <CardDescription>
                            {plant.scientificName}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                          <div className="space-y-2 text-sm">
                            <p><strong>Watering:</strong> {plant.watering}</p>
                            <p><strong>Light:</strong> {plant.light}</p>
                            <p><strong>Fertilizing:</strong> {plant.fertilizing}</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
                
                {careGuide.plants.map((plant, index) => (
                  <TabsContent key={index} value={`plant-${index}`}>
                    <Card className="border-blue-100">
                      <CardHeader>
                        <CardTitle>{plant.name}</CardTitle>
                        <CardDescription>{plant.scientificName}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <h4 className="font-medium text-blue-600 dark:text-blue-400">Watering</h4>
                              <p className="text-sm">{plant.watering}</p>
                            </div>
                            <div className="space-y-2">
                              <h4 className="font-medium text-yellow-600 dark:text-yellow-400">Light</h4>
                              <p className="text-sm">{plant.light}</p>
                            </div>
                            <div className="space-y-2">
                              <h4 className="font-medium text-green-600 dark:text-green-400">Fertilizing</h4>
                              <p className="text-sm">{plant.fertilizing}</p>
                            </div>
                            <div className="space-y-2">
                              <h4 className="font-medium text-purple-600 dark:text-purple-400">Pruning</h4>
                              <p className="text-sm">{plant.pruning}</p>
                            </div>
                          </div>
                          
                          {plant.specialCare && (
                            <div className="border-t pt-4 mt-4">
                              <h4 className="font-medium text-orange-600 dark:text-orange-400 flex items-center">
                                <Info className="h-4 w-4 mr-1" />
                                Special Care for this Season
                              </h4>
                              <p className="text-sm mt-2">{plant.specialCare}</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                ))}
              </Tabs>
            </div>
          </CardContent>
          <CardFooter className="bg-blue-50 dark:bg-blue-950 flex justify-center border-t border-blue-100 dark:border-blue-800">
            <p className="text-sm text-blue-700 dark:text-blue-400 flex items-center">
              <Brain className="mr-2 h-4 w-4" />
              AI-powered recommendations powered by OpenAI
            </p>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}