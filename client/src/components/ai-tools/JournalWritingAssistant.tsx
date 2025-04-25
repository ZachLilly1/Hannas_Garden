import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Brain, BookOpen, Edit, Copy, CheckCheck } from "lucide-react";
import { apiRequest } from '@/lib/queryClient';
import { CareLog, PlantWithCare } from '@shared/schema';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Interface for the OpenAI response
interface EnhancedJournalEntry {
  title: string;
  narrative: string;
  observations: string[];
  careDetails: string;
  growthProgress: string;
  nextSteps: string[];
}

export function JournalWritingAssistant() {
  const { toast } = useToast();
  const [selectedPlantId, setSelectedPlantId] = useState<string>("");
  const [selectedCareLogId, setSelectedCareLogId] = useState<string>("");
  const [journalEntry, setJournalEntry] = useState<EnhancedJournalEntry | null>(null);
  const [copied, setCopied] = useState(false);
  
  // Query to get user's plants
  const { data: plants, isLoading: isPlantsLoading } = useQuery<PlantWithCare[]>({
    queryKey: ['/api/plants'],
  });
  
  // Query to get care logs for selected plant
  const { data: careLogs, isLoading: isLogsLoading } = useQuery<CareLog[]>({
    queryKey: ['/api/plants', selectedPlantId, 'care-logs'],
    enabled: Boolean(selectedPlantId),
  });
  
  // Reset care log selection when plant changes
  const handlePlantChange = (plantId: string) => {
    setSelectedPlantId(plantId);
    setSelectedCareLogId("");
  };
  
  // Mutation to get journal entry
  const journalMutation = useMutation({
    mutationFn: async (careLogId: string) => {
      const res = await apiRequest(
        "POST", 
        `/api/ai/journal-entry/${careLogId}`, 
        {}
      );
      return res.json();
    },
    onSuccess: (data: EnhancedJournalEntry) => {
      setJournalEntry(data);
      toast({
        title: "Journal entry generated",
        description: "Your enhanced journal entry is ready!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to generate journal entry",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const generateJournalEntry = () => {
    if (selectedCareLogId) {
      journalMutation.mutate(selectedCareLogId);
    } else {
      toast({
        title: "No care log selected",
        description: "Please select a care log to generate a journal entry",
        variant: "destructive",
      });
    }
  };
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({
      title: "Copied to clipboard",
      description: "Journal content copied successfully",
    });
    setTimeout(() => setCopied(false), 2000);
  };
  
  // Generate the full journal text
  const getFullJournalText = () => {
    if (!journalEntry) return "";
    
    return `# ${journalEntry.title}

${journalEntry.narrative}

## Observations
${journalEntry.observations.map(obs => `- ${obs}`).join('\n')}

## Care Details
${journalEntry.careDetails}

## Growth Progress
${journalEntry.growthProgress}

## Next Steps
${journalEntry.nextSteps.map(step => `- ${step}`).join('\n')}
`;
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="plant-select">Select a Plant</Label>
              <Select onValueChange={handlePlantChange} value={selectedPlantId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a plant from your collection" />
                </SelectTrigger>
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
            </div>
            
            {selectedPlantId && (
              <div className="space-y-3">
                <Label htmlFor="carelog-select">Select a Care Log</Label>
                <Select onValueChange={setSelectedCareLogId} value={selectedCareLogId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a care log to transform" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLogsLoading ? (
                      <div className="flex justify-center p-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                      </div>
                    ) : careLogs && careLogs.length > 0 ? (
                      careLogs.map((log) => {
                        const date = new Date(log.timestamp || Date.now()).toLocaleDateString();
                        return (
                          <SelectItem key={log.id} value={log.id.toString()}>
                            {date} - {log.careType.charAt(0).toUpperCase() + log.careType.slice(1)}
                          </SelectItem>
                        );
                      })
                    ) : (
                      <div className="p-2 text-center text-sm text-muted-foreground">
                        No care logs found. Add care logs to this plant first.
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <Button 
              onClick={generateJournalEntry} 
              className="w-full"
              disabled={!selectedCareLogId || journalMutation.isPending}
            >
              {journalMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Journal Entry...
                </>
              ) : (
                <>
                  <Edit className="mr-2 h-4 w-4" />
                  Generate Journal Entry
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {journalEntry && (
        <Card className="border-indigo-200 dark:border-indigo-900">
          <CardHeader className="bg-indigo-50 dark:bg-indigo-950">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>{journalEntry.title}</CardTitle>
                <CardDescription>
                  AI-enhanced journal entry based on your care log
                </CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8"
                onClick={() => copyToClipboard(getFullJournalText())}
              >
                {copied ? (
                  <>
                    <CheckCheck className="mr-2 h-4 w-4" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy All
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="narrative" className="w-full">
              <TabsList className="w-full justify-start mb-4">
                <TabsTrigger value="narrative">Narrative</TabsTrigger>
                <TabsTrigger value="observations">Observations</TabsTrigger>
                <TabsTrigger value="care">Care Details</TabsTrigger>
                <TabsTrigger value="progress">Growth Progress</TabsTrigger>
                <TabsTrigger value="nextSteps">Next Steps</TabsTrigger>
              </TabsList>
              
              <TabsContent value="narrative" className="space-y-4">
                <p className="text-md leading-relaxed whitespace-pre-line">{journalEntry.narrative}</p>
              </TabsContent>
              
              <TabsContent value="observations" className="space-y-4">
                <ul className="space-y-2 pl-6 list-disc">
                  {journalEntry.observations.map((observation, index) => (
                    <li key={index} className="text-md">{observation}</li>
                  ))}
                </ul>
              </TabsContent>
              
              <TabsContent value="care" className="space-y-4">
                <p className="text-md leading-relaxed whitespace-pre-line">{journalEntry.careDetails}</p>
              </TabsContent>
              
              <TabsContent value="progress" className="space-y-4">
                <p className="text-md leading-relaxed whitespace-pre-line">{journalEntry.growthProgress}</p>
              </TabsContent>
              
              <TabsContent value="nextSteps" className="space-y-4">
                <ul className="space-y-2 pl-6 list-disc">
                  {journalEntry.nextSteps.map((step, index) => (
                    <li key={index} className="text-md">{step}</li>
                  ))}
                </ul>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="bg-indigo-50 dark:bg-indigo-950 flex justify-center border-t border-indigo-100 dark:border-indigo-800">
            <p className="text-sm text-indigo-700 dark:text-indigo-400 flex items-center">
              <Brain className="mr-2 h-4 w-4" />
              AI-powered journal writing powered by OpenAI
            </p>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}