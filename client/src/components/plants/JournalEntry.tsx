import React, { useState } from "react";
import { Brain, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

// Define interface for the journal entry
interface JournalEntryData {
  title: string;
  observations: string[];
  growthProgress: string;
}

interface JournalEntryProps {
  careLogId: number;
  plantId: number;
  hasPhoto: boolean;
}

export function JournalEntry({ careLogId, plantId, hasPhoto }: JournalEntryProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [journalEntry, setJournalEntry] = useState<JournalEntryData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const generateJournalEntry = async () => {
    try {
      setIsLoading(true);
      const res = await apiRequest(
        "POST", 
        `/api/ai/journal-entry/${careLogId}?plantId=${plantId}`, 
        {}
      );
      const data = await res.json();
      setJournalEntry(data);
      setIsExpanded(true);
    } catch (error) {
      console.error("Failed to generate journal entry:", error);
      toast({
        title: "Failed to generate journal entry",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // If the log doesn't have a photo, don't render the journal section
  if (!hasPhoto) {
    return null;
  }

  return (
    <div className="mt-2">
      {!journalEntry && !isLoading ? (
        <Button 
          variant="outline" 
          size="sm" 
          className="text-xs flex items-center"
          onClick={generateJournalEntry}
        >
          <Brain className="h-3 w-3 mr-1" />
          Generate AI Analysis
        </Button>
      ) : isLoading ? (
        <Button 
          variant="outline" 
          size="sm" 
          className="text-xs flex items-center"
          disabled
        >
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          Generating Analysis...
        </Button>
      ) : (
        <div className="mt-3">
          <div 
            className="flex items-center justify-between cursor-pointer" 
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className="flex items-center">
              <Brain className="h-3 w-3 mr-2 text-indigo-500" />
              <span className="text-sm font-medium">AI Analysis</span>
            </div>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </div>
          
          {isExpanded && journalEntry && (
            <Card className="mt-2 border-indigo-100">
              <CardContent className="p-3">
                <h4 className="text-sm font-medium mb-2">{journalEntry.title}</h4>
                
                <Tabs defaultValue="observations" className="w-full">
                  <TabsList className="w-full mb-2 h-8">
                    <TabsTrigger value="observations" className="text-xs">Observations</TabsTrigger>
                    <TabsTrigger value="growth" className="text-xs">Growth Progress</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="observations">
                    <ul className="text-xs space-y-1 pl-5 list-disc">
                      {journalEntry.observations.map((obs, idx) => (
                        <li key={idx}>{obs}</li>
                      ))}
                    </ul>
                  </TabsContent>
                  
                  <TabsContent value="growth">
                    <p className="text-xs whitespace-pre-line">
                      {journalEntry.growthProgress}
                    </p>
                  </TabsContent>
                </Tabs>
                
                <div className="mt-2 pt-2 border-t border-indigo-50 flex justify-end">
                  <span className="text-xs text-indigo-400 flex items-center">
                    <Brain className="h-3 w-3 mr-1" />
                    AI-powered analysis
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}