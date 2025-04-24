import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { type InsertCareLog, CARE_TYPES } from '@shared/schema';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CameraIcon, LeafIcon, BrainIcon, WaterDropIcon, SeedlingIcon } from '@/lib/icons';
import { apiRequest } from '@/lib/queryClient';
import { toast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';


// Plant health diagnosis type definition
interface PlantHealthDiagnosis {
  issue: string;
  cause: string;
  solution: string;
  preventionTips: string[];
  severity: "low" | "medium" | "high";
  confidenceLevel: "low" | "medium" | "high";
}

// AI care suggestion type
interface AiCareSuggestion {
  type: "water" | "fertilize" | "prune" | "repot" | "health_check";
  confidence: "low" | "medium" | "high";
  reason: string;
  recommendation: string;
  isUrgent: boolean;
}

interface CareLogFormProps {
  plantId: number;
  onSuccess?: () => void;
}

export function CareLogForm({ plantId, onSuccess }: CareLogFormProps) {
  const [selectedCareType, setSelectedCareType] = useState<string>(CARE_TYPES[0]);
  const [notes, setNotes] = useState('');
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingAiSuggestions, setIsGeneratingAiSuggestions] = useState(false);
  const [healthDiagnosis, setHealthDiagnosis] = useState<PlantHealthDiagnosis | null>(null);
  const [aiCareSuggestions, setAiCareSuggestions] = useState<AiCareSuggestion[]>([]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'Image too large',
          description: 'Please select an image smaller than 5MB',
          variant: 'destructive',
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = async (e) => {
        const result = e.target?.result as string;
        if (result) {
          // Store base64 string without the prefix (data:image/jpeg;base64,)
          const base64Data = result.split(',')[1];
          setPhotoBase64(base64Data);
          
          // Analyze plant health with the photo if it's not a fertilizing or watering log
          if (selectedCareType !== 'water' && selectedCareType !== 'fertilize') {
            await analyzePlantHealth(base64Data);
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };
  
  const analyzePlantHealth = async (imageBase64: string) => {
    try {
      setIsAnalyzing(true);
      setHealthDiagnosis(null);
      
      const response = await apiRequest('POST', '/api/diagnose-plant-health', { imageBase64 });
      
      if (!response.ok) {
        throw new Error('Failed to analyze plant health');
      }
      
      const diagnosis = await response.json();
      setHealthDiagnosis(diagnosis);
      
      // Automatically add the diagnosis to notes if we got a result
      if (diagnosis && diagnosis.issue) {
        const healthNote = `Plant health analysis: ${diagnosis.issue} (${diagnosis.severity} severity). ${diagnosis.solution}`;
        setNotes(notes ? `${notes}\n\n${healthNote}` : healthNote);
      }
      
      // After analyzing health, generate care suggestions
      generateAiCareSuggestions(imageBase64);
    } catch (error) {
      console.error('Error analyzing plant health:', error);
      toast({
        title: 'Plant analysis failed',
        description: 'Could not analyze plant health from the image',
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  const generateAiCareSuggestions = async (imageBase64: string) => {
    try {
      setIsGeneratingAiSuggestions(true);
      setAiCareSuggestions([]);
      
      // In a real implementation, this would be an API call to the OpenAI service
      // For now, we'll simulate the response with a timeout
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Simulated AI response based on common plant needs
      const suggestions: AiCareSuggestion[] = [
        {
          type: "water",
          confidence: "high",
          reason: "Soil appears dry based on the image color and texture.",
          recommendation: "Water thoroughly until moisture comes out of the drainage holes.",
          isUrgent: true
        },
        {
          type: "fertilize",
          confidence: "medium",
          reason: "Slight yellowing of lower leaves indicates potential nutrient deficiency.",
          recommendation: "Apply balanced fertilizer at half strength.",
          isUrgent: false
        }
      ];
      
      setAiCareSuggestions(suggestions);
      
    } catch (error) {
      console.error('Error generating AI care suggestions:', error);
      // Don't show a toast for this - it's an enhancement, not a critical feature
    } finally {
      setIsGeneratingAiSuggestions(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCareType) {
      toast({
        title: 'Missing information',
        description: 'Please select a care type',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      
      const careLogData: InsertCareLog & { photoBase64?: string, healthDiagnosis?: PlantHealthDiagnosis } = {
        plantId,
        careType: selectedCareType,
        notes: notes.trim() || `Logged ${selectedCareType} care`,
      };
      
      // Add photo if present
      if (photoBase64) {
        careLogData.photoBase64 = photoBase64;
      }
      
      // Add health diagnosis data if available
      if (healthDiagnosis && selectedCareType === 'health_check') {
        careLogData.healthDiagnosis = healthDiagnosis;
      }

      await apiRequest('POST', '/api/care-logs', careLogData);
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/plants'] });
      queryClient.invalidateQueries({ queryKey: ['/api/plants', plantId.toString()] });
      queryClient.invalidateQueries({ queryKey: ['/api/plants', plantId.toString(), 'care-logs'] });
      
      toast({
        title: 'Care logged successfully',
        description: `${selectedCareType.charAt(0).toUpperCase() + selectedCareType.slice(1)} care logged`,
      });
      
      // Reset form
      setSelectedCareType(CARE_TYPES[0]);
      setNotes('');
      setPhotoBase64(null);
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      toast({
        title: 'Failed to log care',
        description: 'An error occurred while logging care',
        variant: 'destructive',
      });
      console.error('Error logging care:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Care Type</Label>
        <RadioGroup
          value={selectedCareType}
          onValueChange={setSelectedCareType}
          className="flex flex-wrap gap-2"
        >
          {CARE_TYPES.map(careType => (
            <div key={careType} className="flex items-center space-x-2">
              <RadioGroupItem value={careType} id={`care-type-${careType}`} />
              <Label htmlFor={`care-type-${careType}`} className="capitalize">
                {careType}
              </Label>
              {careType === 'health_check' && photoBase64 && healthDiagnosis && (
                <span className={`ml-1 inline-flex h-2 w-2 rounded-full ${
                  healthDiagnosis.severity === 'high' 
                    ? 'bg-red-500' 
                    : healthDiagnosis.severity === 'medium' 
                      ? 'bg-amber-500' 
                      : 'bg-blue-500'
                }`} />
              )}
            </div>
          ))}
        </RadioGroup>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea
          id="notes"
          placeholder="Add details about this care activity..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="h-20"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="photo">Add Photo (optional)</Label>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            className="relative"
            onClick={() => document.getElementById('photo-upload')?.click()}
          >
            <CameraIcon className="h-4 w-4 mr-2" />
            {photoBase64 ? 'Change Photo' : 'Add Photo'}
            <input
              id="photo-upload"
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handleFileChange}
            />
          </Button>
          
          {photoBase64 && (
            <div className="h-16 w-16 relative rounded-md overflow-hidden">
              <img
                src={`data:image/jpeg;base64,${photoBase64}`}
                alt="Care log photo"
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                className="absolute top-0 right-0 bg-black bg-opacity-50 text-white p-1 text-xs"
                onClick={() => setPhotoBase64(null)}
              >
                ✕
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Plant Health Analysis Display */}
      {isAnalyzing && (
        <div className="flex flex-col items-center justify-center py-4">
          <Spinner size="md" className="text-primary mb-2" />
          <p className="text-sm text-muted-foreground">Analyzing plant health...</p>
        </div>
      )}

      {healthDiagnosis && !isAnalyzing && (
        <Alert className={healthDiagnosis.severity === 'high' ? 'border-red-500' : healthDiagnosis.severity === 'medium' ? 'border-amber-500' : 'border-blue-500'}>
          <LeafIcon className="h-4 w-4 mr-2" />
          <AlertTitle className="flex items-center gap-2">
            Plant Health Issue Detected: {healthDiagnosis.issue}
            <span className={`px-2 py-0.5 text-xs rounded-full ${
              healthDiagnosis.severity === 'high' 
                ? 'bg-destructive text-destructive-foreground' 
                : healthDiagnosis.severity === 'medium' 
                  ? 'bg-amber-500 text-white' 
                  : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
            }`}>
              {healthDiagnosis.severity.toUpperCase()} severity
            </span>
          </AlertTitle>
          <AlertDescription className="mt-2">
            <p className="mt-1"><strong>Cause:</strong> {healthDiagnosis.cause}</p>
            <p className="mt-2"><strong>Solution:</strong> {healthDiagnosis.solution}</p>
            {healthDiagnosis.preventionTips.length > 0 && (
              <div className="mt-2">
                <strong>Prevention Tips:</strong>
                <ul className="list-disc pl-5 mt-1 text-sm">
                  {healthDiagnosis.preventionTips.map((tip, index) => (
                    <li key={index}>{tip}</li>
                  ))}
                </ul>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}
      
      {/* AI Care Suggestions */}
      {isGeneratingAiSuggestions && (
        <div className="flex flex-col items-center justify-center py-4">
          <div className="flex items-center gap-2">
            <BrainIcon className="h-4 w-4 text-primary animate-pulse" />
            <p className="text-sm text-muted-foreground">Generating AI care suggestions...</p>
          </div>
        </div>
      )}
      
      {!isGeneratingAiSuggestions && aiCareSuggestions.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-muted/50 dark:bg-muted/20 px-4 py-3 flex items-center">
            <BrainIcon className="h-4 w-4 mr-2 text-primary" />
            <h3 className="text-sm font-medium">AI Care Suggestions</h3>
          </div>
          
          <div className="divide-y">
            {aiCareSuggestions.map((suggestion, index) => (
              <Card key={index} className="border-0 rounded-none shadow-none">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm flex items-center">
                    {suggestion.type === 'water' && <WaterDropIcon className="h-4 w-4 mr-2 text-blue-500" />}
                    {suggestion.type === 'fertilize' && <SeedlingIcon className="h-4 w-4 mr-2 text-green-500" />}
                    <span className="capitalize">{suggestion.type}</span>
                    {suggestion.isUrgent && (
                      <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
                        Urgent
                      </span>
                    )}
                  </CardTitle>
                  <CardDescription className="text-xs mt-1 line-clamp-2">
                    {suggestion.reason}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-1 pb-3">
                  <p className="text-xs text-muted-foreground">
                    <strong>Recommendation:</strong> {suggestion.recommendation}
                  </p>
                </CardContent>
                <CardFooter className="p-3 pt-0 flex justify-end">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="text-xs"
                    onClick={() => {
                      setSelectedCareType(suggestion.type);
                      setNotes(suggestion.recommendation);
                    }}
                  >
                    Apply Suggestion
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      )}
    
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Logging care...' : 'Log Care'}
      </Button>
    </form>
  );
}

export default CareLogForm;