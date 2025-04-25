import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Brain, Calendar, Clock, CheckCircle, X, CalendarClock } from "lucide-react";
import { apiRequest } from '@/lib/queryClient';
import { PlantWithCare } from '@shared/schema';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import type { SubmitHandler } from 'react-hook-form';
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";

// Interface for the OpenAI response
interface OptimizedCareSchedule {
  weeklySchedule: {
    day: string;
    tasks: {
      plantName: string;
      careType: string;
      estimatedTime: string;
      instructions: string;
    }[];
  }[];
  specialNotes: string[];
  efficiencyTips: string[];
}

// Interface for the schedule form
interface UserSchedule {
  weekdays: { day: string; availableTimeSlots: string[] }[];
  preferences: { preferredTime: string; maxDailyMinutes: number };
}

// Form schema
const scheduleSchema = z.object({
  maxDailyMinutes: z.coerce.number().default(15),
  preferredTime: z.string().default("morning"),
  monday: z.boolean().default(true),
  tuesday: z.boolean().default(true),
  wednesday: z.boolean().default(true),
  thursday: z.boolean().default(true),
  friday: z.boolean().default(true),
  saturday: z.boolean().default(true),
  sunday: z.boolean().default(true),
  morningSlot: z.boolean().default(true),
  afternoonSlot: z.boolean().default(false),
  eveningSlot: z.boolean().default(false),
});

type FormValues = z.infer<typeof scheduleSchema>;

export function CareScheduleOptimizer() {
  const { toast } = useToast();
  const [schedule, setSchedule] = useState<OptimizedCareSchedule | null>(null);
  
  // Query to get user's plants
  const { data: plants, isLoading: isPlantsLoading } = useQuery<PlantWithCare[]>({
    queryKey: ['/api/plants'],
  });
  
  // Form
  const form = useForm<FormValues>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      maxDailyMinutes: 15,
      preferredTime: "morning",
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: true,
      sunday: true,
      morningSlot: true,
      afternoonSlot: false,
      eveningSlot: false,
    },
  });
  
  // Helper function to convert form values to API payload
  const getSchedulePayload = (formValues: FormValues): UserSchedule => {
    const weekdays = [
      { key: "monday", label: "Monday" },
      { key: "tuesday", label: "Tuesday" },
      { key: "wednesday", label: "Wednesday" },
      { key: "thursday", label: "Thursday" },
      { key: "friday", label: "Friday" },
      { key: "saturday", label: "Saturday" },
      { key: "sunday", label: "Sunday" },
    ];
    
    const timeSlots = [
      { key: "morningSlot", value: "morning" },
      { key: "afternoonSlot", value: "afternoon" },
      { key: "eveningSlot", value: "evening" },
    ];
    
    const availableDays = weekdays
      .filter(day => formValues[day.key as keyof FormValues])
      .map(day => {
        const availableTimeSlots = timeSlots
          .filter(slot => formValues[slot.key as keyof FormValues])
          .map(slot => slot.value);
        
        return {
          day: day.label,
          availableTimeSlots,
        };
      });
    
    return {
      weekdays: availableDays,
      preferences: {
        preferredTime: formValues.preferredTime,
        maxDailyMinutes: formValues.maxDailyMinutes,
      },
    };
  };
  
  // Mutation to get optimized schedule
  const scheduleMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      if (!plants || plants.length === 0) {
        throw new Error("You need to have plants in your collection to generate a care schedule");
      }
      
      const schedulePayload = getSchedulePayload(data);
      
      const res = await apiRequest(
        "POST", 
        "/api/ai/optimized-schedule", 
        {
          userSchedule: schedulePayload,
          plantIds: plants.map(p => p.id)
        }
      );
      return res.json();
    },
    onSuccess: (data: OptimizedCareSchedule) => {
      setSchedule(data);
      toast({
        title: "Care schedule generated",
        description: "Your optimized plant care schedule is ready!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to generate schedule",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const onSubmit: SubmitHandler<FormValues> = (values) => {
    scheduleMutation.mutate(values);
  };
  
  // Get color for care type
  const getCareTypeColor = (careType: string) => {
    switch (careType) {
      case "water":
        return "text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-900";
      case "fertilize":
        return "text-green-500 dark:text-green-400 bg-green-50 dark:bg-green-900";
      case "prune":
        return "text-purple-500 dark:text-purple-400 bg-purple-50 dark:bg-purple-900";
      case "repot":
        return "text-amber-500 dark:text-amber-400 bg-amber-50 dark:bg-amber-900";
      case "health_check":
        return "text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900";
      default:
        return "text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800";
    }
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-base font-medium">Availability</h3>
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Available Days</Label>
                    <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 mt-2">
                      {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                        <FormField
                          key={day}
                          control={form.control}
                          name={day as keyof FormValues}
                          render={({ field }) => (
                            <FormItem className="flex flex-col items-center space-y-2">
                              <FormControl>
                                <div className="flex flex-col items-center justify-center space-y-1">
                                  <Checkbox 
                                    checked={field.value as boolean} 
                                    onCheckedChange={field.onChange}
                                    id={day}
                                  />
                                  <Label 
                                    htmlFor={day} 
                                    className="text-xs font-normal cursor-pointer"
                                  >
                                    {day.charAt(0).toUpperCase() + day.slice(1).substring(0, 2)}
                                  </Label>
                                </div>
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium">Time of Day</Label>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {[
                        { id: 'morningSlot', label: 'Morning' },
                        { id: 'afternoonSlot', label: 'Afternoon' },
                        { id: 'eveningSlot', label: 'Evening' }
                      ].map((slot) => (
                        <FormField
                          key={slot.id}
                          control={form.control}
                          name={slot.id as keyof FormValues}
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-2 space-y-0 p-2 border rounded-md">
                              <FormControl>
                                <Checkbox 
                                  checked={field.value as boolean} 
                                  onCheckedChange={field.onChange}
                                  id={slot.id}
                                />
                              </FormControl>
                              <Label 
                                htmlFor={slot.id} 
                                className="text-sm font-normal cursor-pointer"
                              >
                                {slot.label}
                              </Label>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="grid gap-6 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="preferredTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preferred Time of Day</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select preferred time" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="morning">Morning</SelectItem>
                          <SelectItem value="afternoon">Afternoon</SelectItem>
                          <SelectItem value="evening">Evening</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        When do you prefer to take care of your plants?
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="maxDailyMinutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Minutes Per Day</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="5" 
                          max="60" 
                          placeholder="15" 
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Maximum time you want to spend per day
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {isPlantsLoading ? (
                <div className="p-4 border rounded-md text-center space-y-2">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  <p className="text-sm text-muted-foreground">Loading your plants...</p>
                </div>
              ) : !plants || plants.length === 0 ? (
                <Alert variant="destructive">
                  <AlertTitle>No plants found</AlertTitle>
                  <AlertDescription>
                    Please add plants to your collection before generating a care schedule.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="p-4 border rounded-md">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium">Plants in your collection</h3>
                    <span className="text-xs text-muted-foreground">{plants.length} plants</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    Your care schedule will be optimized for all plants in your collection.
                  </p>
                </div>
              )}
              
              <Button 
                type="submit" 
                className="w-full"
                disabled={scheduleMutation.isPending || !plants || plants.length === 0}
              >
                {scheduleMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Schedule...
                  </>
                ) : (
                  <>Generate Optimized Schedule</>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      {schedule && (
        <Card className="border-orange-200 dark:border-orange-900">
          <CardHeader className="bg-orange-50 dark:bg-orange-950">
            <CardTitle className="flex items-center text-base">
              <Calendar className="mr-2 h-5 w-5 text-orange-500" />
              Your Optimized Care Schedule
            </CardTitle>
            <CardDescription>
              AI-generated schedule based on your plants' needs and your availability
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <Tabs defaultValue="schedule" className="w-full">
              <TabsList className="w-full justify-start mb-4">
                <TabsTrigger value="schedule">
                  <CalendarClock className="h-4 w-4 mr-2" />
                  Weekly Schedule
                </TabsTrigger>
                <TabsTrigger value="notes">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Tips & Notes
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="schedule" className="space-y-6">
                {schedule.weeklySchedule.map((day, dayIndex) => (
                  <Card key={dayIndex} className={day.tasks.length > 0 ? "border-orange-100 dark:border-orange-800" : "border-slate-100 dark:border-slate-700"}>
                    <CardHeader className={`pb-2 ${day.tasks.length > 0 ? "bg-orange-50 dark:bg-orange-950" : "bg-slate-50 dark:bg-slate-800"}`}>
                      <CardTitle className="text-base">{day.day}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      {day.tasks.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground text-sm">
                          <Clock className="h-5 w-5 mx-auto mb-2 text-slate-400" />
                          No tasks scheduled for this day
                        </div>
                      ) : (
                        <div className="divide-y">
                          {day.tasks.map((task, taskIndex) => (
                            <div key={taskIndex} className="p-4">
                              <div className="flex justify-between items-start">
                                <div className="flex items-center">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${getCareTypeColor(task.careType)}`}>
                                    {task.careType === 'water' && <span className="text-lg">💧</span>}
                                    {task.careType === 'fertilize' && <span className="text-lg">🌱</span>}
                                    {task.careType === 'prune' && <span className="text-lg">✂️</span>}
                                    {task.careType === 'repot' && <span className="text-lg">🪴</span>}
                                    {task.careType === 'health_check' && <span className="text-lg">🔍</span>}
                                    {task.careType === 'other' && <span className="text-lg">⚙️</span>}
                                  </div>
                                  <div>
                                    <h4 className="font-medium text-sm">{task.plantName}</h4>
                                    <p className="text-xs text-muted-foreground capitalize">
                                      {task.careType.replace('_', ' ')}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
                                  {task.estimatedTime}
                                </div>
                              </div>
                              <p className="text-sm mt-2 pl-11">{task.instructions}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
              
              <TabsContent value="notes" className="space-y-6">
                <Card className="border-green-100 dark:border-green-800">
                  <CardHeader className="pb-2 bg-green-50 dark:bg-green-950">
                    <CardTitle className="text-base">Efficiency Tips</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <ul className="space-y-2">
                      {schedule.efficiencyTips.map((tip, index) => (
                        <li key={index} className="flex items-start">
                          <CheckCircle className="h-4 w-4 mr-2 text-green-500 dark:text-green-400 mt-0.5" />
                          <p className="text-sm">{tip}</p>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
                
                {schedule.specialNotes.length > 0 && (
                  <Card className="border-amber-100 dark:border-amber-800">
                    <CardHeader className="pb-2 bg-amber-50 dark:bg-amber-950">
                      <CardTitle className="text-base">Special Notes</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                      <ul className="space-y-2">
                        {schedule.specialNotes.map((note, index) => (
                          <li key={index} className="flex items-start">
                            <span className="bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 rounded-full w-5 h-5 flex items-center justify-center mr-2 mt-0.5 flex-shrink-0 text-xs">
                              {index + 1}
                            </span>
                            <p className="text-sm">{note}</p>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="bg-orange-50 dark:bg-orange-950 flex justify-center border-t border-orange-100 dark:border-orange-800">
            <p className="text-sm text-orange-700 dark:text-orange-400 flex items-center">
              <Brain className="mr-2 h-4 w-4" />
              AI-powered schedule optimization powered by OpenAI
            </p>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}