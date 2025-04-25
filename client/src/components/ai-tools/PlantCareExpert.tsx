import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Brain, Search, Leaf, ExternalLink, Info } from "lucide-react";
import { apiRequest } from '@/lib/queryClient';
import { PlantWithCare } from '@shared/schema';
import { Link } from "wouter";

// Interface for the OpenAI response
interface PlantCareAnswer {
  answer: string;
  recommendations: string[];
  relatedPlants?: string[];
  additionalResources?: string[];
  confidenceLevel: "low" | "medium" | "high";
}

export function PlantCareExpert() {
  const { toast } = useToast();
  const [question, setQuestion] = useState<string>("");
  const [includeUserPlants, setIncludeUserPlants] = useState<boolean>(true);
  const [answer, setAnswer] = useState<PlantCareAnswer | null>(null);
  
  // Query to get user's plants
  const { data: plants, isLoading: isPlantsLoading } = useQuery<PlantWithCare[]>({
    queryKey: ['/api/plants'],
  });
  
  // Mutation to get answer
  const answerMutation = useMutation({
    mutationFn: async () => {
      if (!question.trim()) {
        throw new Error("Please enter a question");
      }
      
      const res = await apiRequest(
        "POST", 
        "/api/ai/plant-care-answer", 
        { 
          question: question.trim(),
          includeUserPlants: includeUserPlants && plants && plants.length > 0
        }
      );
      return res.json();
    },
    onSuccess: (data: PlantCareAnswer) => {
      setAnswer(data);
      toast({
        title: "Answer generated",
        description: "Expert answer to your plant care question is ready!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to generate answer",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Get confidence level badge color
  const getConfidenceBadgeColor = (level: "low" | "medium" | "high") => {
    switch (level) {
      case "high":
        return "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200";
      case "medium":
        return "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200";
      case "low":
        return "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200";
      default:
        return "";
    }
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="question">Your Plant Care Question</Label>
              <Textarea
                id="question"
                placeholder="Ask anything about plant care, e.g., 'Why are my monstera leaves turning yellow?' or 'How often should I water a snake plant?'"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="h-32 resize-none"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="include-plants"
                checked={includeUserPlants}
                onCheckedChange={(checked) => setIncludeUserPlants(checked as boolean)}
              />
              <Label
                htmlFor="include-plants"
                className="text-sm font-normal cursor-pointer"
              >
                Include my plant collection for personalized answers
              </Label>
            </div>
            
            {includeUserPlants && isPlantsLoading && (
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Loading your plants...</span>
              </div>
            )}
            
            {includeUserPlants && plants && plants.length === 0 && (
              <Alert className="bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-900">
                <Info className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                <AlertTitle>No plants in your collection</AlertTitle>
                <AlertDescription>
                  Add plants to your collection to get more personalized answers.
                </AlertDescription>
              </Alert>
            )}
            
            <Button 
              onClick={() => answerMutation.mutate()} 
              className="w-full"
              disabled={!question.trim() || answerMutation.isPending}
            >
              {answerMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Finding Answer...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Get Expert Answer
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {answer && (
        <Card className="border-amber-200">
          <CardHeader className="bg-amber-50 dark:bg-amber-950">
            <div className="flex justify-between items-start">
              <span className="flex items-center font-medium">
                <Brain className="mr-2 h-5 w-5 text-amber-500 dark:text-amber-400" />
                Answer
              </span>
              <div className={`px-2 py-1 rounded-full text-xs ${getConfidenceBadgeColor(answer.confidenceLevel)}`}>
                {answer.confidenceLevel.charAt(0).toUpperCase() + answer.confidenceLevel.slice(1)} confidence
              </div>
            </div>
            <CardDescription>
              AI-powered response to your plant care question
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-6">
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <p className="whitespace-pre-line">{answer.answer}</p>
              </div>
              
              {answer.recommendations && answer.recommendations.length > 0 && (
                <div className="border-t pt-4">
                  <h3 className="text-base font-medium mb-3">Recommendations</h3>
                  <ul className="space-y-2">
                    {answer.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start">
                        <div className="bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 rounded-full w-6 h-6 flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                          {index + 1}
                        </div>
                        <p className="text-sm">{rec}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {answer.relatedPlants && answer.relatedPlants.length > 0 && (
                <div className="border-t pt-4">
                  <h3 className="text-base font-medium mb-3">Related Plants</h3>
                  <div className="flex flex-wrap gap-2">
                    {answer.relatedPlants.map((plant, index) => (
                      <div key={index} className="px-3 py-1.5 bg-amber-100 dark:bg-amber-900 rounded-full text-sm text-amber-800 dark:text-amber-200 flex items-center">
                        <Leaf className="h-3.5 w-3.5 mr-1.5 text-green-600 dark:text-green-400" />
                        {plant}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {answer.additionalResources && answer.additionalResources.length > 0 && (
                <div className="border-t pt-4">
                  <h3 className="text-base font-medium mb-3">Additional Resources</h3>
                  <ul className="space-y-2">
                    {answer.additionalResources.map((resource, index) => (
                      <li key={index} className="flex items-center">
                        <ExternalLink className="h-4 w-4 mr-2 text-amber-500 dark:text-amber-400" />
                        <span className="text-sm">{resource}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="bg-amber-50 dark:bg-amber-950 flex justify-center border-t border-amber-100 dark:border-amber-800">
            <p className="text-sm text-amber-700 dark:text-amber-400 flex items-center">
              <Brain className="mr-2 h-4 w-4" />
              AI-powered plant expertise powered by OpenAI
            </p>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}