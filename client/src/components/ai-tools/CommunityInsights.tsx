import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Brain, Users, Droplet, Sun, Sprout, CircleAlert, ThumbsUp } from "lucide-react";
import { apiRequest } from '@/lib/queryClient';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Interface for the OpenAI response
interface CommunityInsight {
  plantType: string;
  bestPractices: {
    watering: string;
    light: string;
    soil: string;
    fertilizing: string;
  };
  commonIssues: {
    issue: string;
    frequency: string;
    solutions: string[];
  }[];
  successPatterns: string[];
  overallRecommendations: string;
}

// Form schema
const insightFormSchema = z.object({
  plantType: z.string().min(3, {
    message: "Plant type must be at least 3 characters.",
  }),
});

type InsightFormValues = z.infer<typeof insightFormSchema>;

export function CommunityInsights() {
  const { toast } = useToast();
  const [insights, setInsights] = useState<CommunityInsight | null>(null);
  
  // Form
  const form = useForm<InsightFormValues>({
    resolver: zodResolver(insightFormSchema),
    defaultValues: {
      plantType: "",
    },
  });
  
  // Mutation to get community insights
  const insightsMutation = useMutation({
    mutationFn: async (data: InsightFormValues) => {
      const res = await apiRequest(
        "POST", 
        "/api/ai/community-insights", 
        { plantType: data.plantType }
      );
      return res.json();
    },
    onSuccess: (data: CommunityInsight) => {
      setInsights(data);
      toast({
        title: "Community insights generated",
        description: `Insights for ${data.plantType} are ready!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to generate insights",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = (values: InsightFormValues) => {
    insightsMutation.mutate(values);
  };
  
  // Get frequency badge color
  const getFrequencyColor = (frequency: string) => {
    const frequencyLower = frequency.toLowerCase();
    if (frequencyLower.includes("high") || frequencyLower.includes("very common")) {
      return "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200";
    } else if (frequencyLower.includes("medium") || frequencyLower.includes("common")) {
      return "bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200";
    } else {
      return "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200";
    }
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="plantType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plant Type</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., Monstera, Snake Plant, Peace Lily" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Enter a plant type to get community insights
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button 
                type="submit" 
                className="w-full"
                disabled={insightsMutation.isPending}
              >
                {insightsMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Gathering Insights...
                  </>
                ) : (
                  <>
                    <Users className="mr-2 h-4 w-4" />
                    Get Community Insights
                  </>
                )}
              </Button>
              
              <Alert className="bg-pink-50 border-pink-200">
                <Users className="h-4 w-4 text-pink-500" />
                <AlertTitle>How this works</AlertTitle>
                <AlertDescription className="text-sm">
                  Our AI analyzes anonymized care data and common practices to provide insights
                  on what works best for specific plant types. These recommendations represent 
                  collective gardening wisdom from the plant community.
                </AlertDescription>
              </Alert>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      {insights && (
        <Card className="border-pink-200">
          <CardHeader className="bg-pink-50 dark:bg-pink-950">
            <CardTitle className="flex items-center">
              <Users className="mr-2 h-5 w-5 text-pink-500 dark:text-pink-400" />
              {insights.plantType} Community Insights
            </CardTitle>
            <CardDescription className="dark:text-pink-300/70">
              Collective wisdom and best practices from the plant community
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <Tabs defaultValue="practices" className="w-full">
              <TabsList className="w-full justify-start mb-4">
                <TabsTrigger value="practices">Best Practices</TabsTrigger>
                <TabsTrigger value="issues">Common Issues</TabsTrigger>
                <TabsTrigger value="success">Success Patterns</TabsTrigger>
              </TabsList>
              
              <TabsContent value="practices" className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <Card className="border-blue-100">
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-sm flex items-center">
                        <Droplet className="h-4 w-4 mr-2 text-blue-500" />
                        Watering
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                      <p className="text-sm">{insights.bestPractices.watering}</p>
                    </CardContent>
                  </Card>
                  
                  <Card className="border-yellow-100">
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-sm flex items-center">
                        <Sun className="h-4 w-4 mr-2 text-yellow-500" />
                        Light
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                      <p className="text-sm">{insights.bestPractices.light}</p>
                    </CardContent>
                  </Card>
                  
                  <Card className="border-brown-100">
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-sm flex items-center">
                        <div className="mr-2 h-4 w-4 bg-amber-800 rounded-full"></div>
                        Soil
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                      <p className="text-sm">{insights.bestPractices.soil}</p>
                    </CardContent>
                  </Card>
                  
                  <Card className="border-green-100">
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-sm flex items-center">
                        <Sprout className="h-4 w-4 mr-2 text-green-500" />
                        Fertilizing
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                      <p className="text-sm">{insights.bestPractices.fertilizing}</p>
                    </CardContent>
                  </Card>
                </div>
                
                <Card className="border-pink-100 dark:border-pink-900">
                  <CardHeader className="p-4 pb-2 bg-pink-50/50 dark:bg-pink-950/50">
                    <CardTitle className="text-base">Overall Recommendations</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <p className="text-sm whitespace-pre-line">{insights.overallRecommendations}</p>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="issues" className="space-y-4">
                <div className="space-y-4">
                  {insights.commonIssues.map((issue, index) => (
                    <Card key={index} className="border-red-50 dark:border-red-900">
                      <CardHeader className="p-4 pb-2">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-base flex items-center">
                            <CircleAlert className="h-4 w-4 mr-2 text-red-500 dark:text-red-400" />
                            {issue.issue}
                          </CardTitle>
                          <div className={`px-2 py-1 rounded-full text-xs ${getFrequencyColor(issue.frequency)}`}>
                            {issue.frequency}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <h4 className="text-sm font-medium">Solutions</h4>
                          <ul className="space-y-2 pl-5 list-disc">
                            {issue.solutions.map((solution, sIndex) => (
                              <li key={sIndex} className="text-sm">{solution}</li>
                            ))}
                          </ul>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="success" className="space-y-4">
                <Card className="border-green-100">
                  <CardHeader className="p-4 pb-2 bg-green-50/50 dark:bg-green-950/50">
                    <CardTitle className="text-base flex items-center">
                      <ThumbsUp className="h-4 w-4 mr-2 text-green-500 dark:text-green-400" />
                      Success Patterns
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <ul className="space-y-3">
                      {insights.successPatterns.map((pattern, index) => (
                        <li key={index} className="flex items-start">
                          <div className="bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 rounded-full w-6 h-6 flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                            {index + 1}
                          </div>
                          <p className="text-sm">{pattern}</p>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="bg-pink-50 dark:bg-pink-950 flex justify-center border-t border-pink-100 dark:border-pink-800">
            <p className="text-sm text-pink-700 dark:text-pink-400 flex items-center">
              <Brain className="mr-2 h-4 w-4" />
              AI-powered community insights powered by OpenAI
            </p>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}