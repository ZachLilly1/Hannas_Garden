import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Brain, ChevronRight, Info, AlertTriangle } from "lucide-react";
import { apiRequest } from '@/lib/queryClient';
import { PlantWithCare } from '@shared/schema';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import type { SubmitHandler } from 'react-hook-form';

// Interface for the OpenAI response
interface PersonalizedAdvice {
  careActions: {
    immediate: string[];
    thisWeek: string[];
    thisMonth: string[];
  };
  observationTips: string[];
  growthExpectations: string;
  seasonalAdjustments: string;
  commonProblems: {
    issue: string;
    symptoms: string;
    solution: string;
  }[];
  successMetrics: string[];
}

// Form schema for user environment
const userEnvironmentSchema = z.object({
  plantId: z.string({
    required_error: "Please select a plant",
  }),
  location: z.string().optional(),
  indoorTemperature: z.string().optional(),
  humidity: z.string().optional(),
  lightConditions: z.string().optional(),
});

type UserEnvironmentFormValues = z.infer<typeof userEnvironmentSchema>;

// Interface for the API request
interface PersonalizedAdviceRequest {
  location?: string;
  indoorTemperature?: number;
  humidity?: number;
  lightConditions?: string;
}

export function PersonalizedPlantAdvisor() {
  const { toast } = useToast();
  const [advice, setAdvice] = useState<PersonalizedAdvice | null>(null);
  const [selectedPlantName, setSelectedPlantName] = useState<string>("");
  
  // Query to get user's plants
  const { data: plants, isLoading: isPlantsLoading } = useQuery<PlantWithCare[]>({
    queryKey: ['/api/plants'],
  });
  
  // Form for user environment
  const form = useForm<UserEnvironmentFormValues>({
    resolver: zodResolver(userEnvironmentSchema),
    defaultValues: {
      plantId: "",
      location: "",
      indoorTemperature: "",
      humidity: "",
      lightConditions: "",
    },
  });
  
  // Mutation to get personalized advice
  const adviceMutation = useMutation({
    mutationFn: async (data: UserEnvironmentFormValues) => {
      const payload: PersonalizedAdviceRequest = {
        location: data.location,
        indoorTemperature: data.indoorTemperature ? Number(data.indoorTemperature) : undefined,
        humidity: data.humidity ? Number(data.humidity) : undefined,
        lightConditions: data.lightConditions
      };
      
      const res = await apiRequest(
        "POST", 
        `/api/ai/personalized-advice/${data.plantId}`, 
        payload
      );
      return res.json();
    },
    onSuccess: (data: PersonalizedAdvice) => {
      setAdvice(data);
      const plant = plants?.find(p => p.id === Number(form.getValues().plantId));
      if (plant) {
        setSelectedPlantName(plant.name);
      }
      toast({
        title: "Personalized advice generated",
        description: "Your plant care recommendations are ready!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to generate advice",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const onSubmit: SubmitHandler<UserEnvironmentFormValues> = (values) => {
    adviceMutation.mutate(values);
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Brain className="mr-2 h-5 w-5 text-purple-500" />
            Personalized Plant Advisor
          </CardTitle>
          <CardDescription>
            Get AI-powered care recommendations tailored to your specific plant and environment
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="plantId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select a Plant</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a plant from your collection" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isPlantsLoading ? (
                          <div className="flex justify-center p-2">
                            <Loader2 className="h-5 w-5 animate-spin" />
                          </div>
                        ) : plants && plants.length > 0 ? (
                          plants.map((plant) => (
                            <SelectItem key={plant.id} value={plant.id.toString()}>
                              {plant.name}
                            </SelectItem>
                          ))
                        ) : (
                          <div className="p-2 text-center text-sm text-muted-foreground">
                            No plants found. Add plants to your collection first.
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Your Environment (Optional)</h3>
                <div className="grid gap-4 sm:grid-cols-2">
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
                    name="indoorTemperature"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Indoor Temperature (°F)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="e.g., 72" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="humidity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Humidity (%)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="e.g., 50" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="lightConditions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Light Conditions</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select light conditions" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="bright direct">Bright Direct</SelectItem>
                            <SelectItem value="bright indirect">Bright Indirect</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="w-full"
                disabled={adviceMutation.isPending}
              >
                {adviceMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Advice...
                  </>
                ) : (
                  <>Generate Personalized Advice</>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      {advice && (
        <Card className="border-green-200">
          <CardHeader className="bg-green-50">
            <CardTitle>Care Advice for {selectedPlantName}</CardTitle>
            <CardDescription>
              Personalized recommendations based on your plant's needs and environment
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-2">Care Actions</h3>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Card className="border-l-4 border-l-red-400">
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-sm">Do Now</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <ul className="list-disc pl-5 space-y-1">
                        {advice.careActions.immediate.map((action, index) => (
                          <li key={index} className="text-sm">{action}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                  
                  <Card className="border-l-4 border-l-orange-400">
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-sm">This Week</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <ul className="list-disc pl-5 space-y-1">
                        {advice.careActions.thisWeek.map((action, index) => (
                          <li key={index} className="text-sm">{action}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                  
                  <Card className="border-l-4 border-l-yellow-400">
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-sm">This Month</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <ul className="list-disc pl-5 space-y-1">
                        {advice.careActions.thisMonth.map((action, index) => (
                          <li key={index} className="text-sm">{action}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </div>
              
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="observation-tips">
                  <AccordionTrigger>
                    <div className="flex items-center">
                      <span>Observation Tips</span>
                      <Info className="ml-2 h-4 w-4 text-muted-foreground" />
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <ul className="list-disc pl-5 space-y-1">
                      {advice.observationTips.map((tip, index) => (
                        <li key={index}>{tip}</li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="growth-expectations">
                  <AccordionTrigger>Growth Expectations</AccordionTrigger>
                  <AccordionContent>
                    <p>{advice.growthExpectations}</p>
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="seasonal-adjustments">
                  <AccordionTrigger>Seasonal Adjustments</AccordionTrigger>
                  <AccordionContent>
                    <p>{advice.seasonalAdjustments}</p>
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="common-problems">
                  <AccordionTrigger>
                    <div className="flex items-center">
                      <span>Common Problems</span>
                      <AlertTriangle className="ml-2 h-4 w-4 text-amber-500" />
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4">
                      {advice.commonProblems.map((problem, index) => (
                        <Card key={index} className="border-amber-200">
                          <CardHeader className="p-4 pb-2">
                            <CardTitle className="text-sm">{problem.issue}</CardTitle>
                          </CardHeader>
                          <CardContent className="p-4 pt-0 space-y-2">
                            <p className="text-sm">
                              <span className="font-medium">Symptoms:</span> {problem.symptoms}
                            </p>
                            <p className="text-sm">
                              <span className="font-medium">Solution:</span> {problem.solution}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="success-metrics">
                  <AccordionTrigger>Success Metrics</AccordionTrigger>
                  <AccordionContent>
                    <ul className="list-disc pl-5 space-y-1">
                      {advice.successMetrics.map((metric, index) => (
                        <li key={index}>{metric}</li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </CardContent>
          <CardFooter className="bg-green-50 flex justify-center border-t border-green-100">
            <p className="text-sm text-green-700 flex items-center">
              <Brain className="mr-2 h-4 w-4" />
              AI-powered recommendations powered by OpenAI
            </p>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}