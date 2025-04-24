import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlantWithCare } from '@shared/schema';
import { CareTimeline } from '@/components/plants/CareTimeline';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { AlertCircle, Loader2, Plus, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { PlantHealthDiagnosis } from '@/types/plant-health';

/**
 * This is a demonstration page that shows how the health diagnosis appears
 * in the care timeline.
 */
export default function HealthDiagnosisDemo() {
  const [plant, setPlant] = useState<PlantWithCare | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreatingHealthLog, setIsCreatingHealthLog] = useState(false);
  const { toast } = useToast();

  // Create a sample health diagnosis log
  const createSampleHealthDiagnosis = async () => {
    if (!plant) return;
    
    try {
      setIsCreatingHealthLog(true);
      
      // Call our demo API endpoint
      const response = await apiRequest(
        'POST', 
        `/api/demo/health-diagnosis/${plant.id}`
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create sample health diagnosis');
      }
      
      const data = await response.json();
      
      // Show success message
      toast({
        title: "Sample health diagnosis created",
        description: "A sample health diagnosis log has been added to this plant's timeline.",
        variant: "default",
      });
      
      // Refresh the care logs in the timeline
      queryClient.invalidateQueries({ queryKey: [`/api/plants/${plant.id}/care-logs`] });
      
    } catch (err) {
      console.error('Error creating sample health diagnosis:', err);
      toast({
        title: "Error creating sample",
        description: err instanceof Error ? err.message : 'An unexpected error occurred',
        variant: "destructive",
      });
    } finally {
      setIsCreatingHealthLog(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch plants, grab the first one for demo
      const response = await apiRequest('GET', '/api/plants');
      const plants = await response.json();
      
      if (plants && plants.length > 0) {
        setPlant(plants[0]);
      } else {
        setError('No plants found. Please add a plant to view the health diagnosis demo.');
      }
    } catch (err) {
      setError('Failed to load plants. You might need to login first.');
      console.error('Error loading plants:', err);
    } finally {
      setLoading(false);
    }
  };

  // Refresh all data
  const refreshData = () => {
    fetchData();
    // Also refresh the care logs for the selected plant
    if (plant) {
      queryClient.invalidateQueries({ queryKey: [`/api/plants/${plant.id}/care-logs`] });
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container px-4 py-8 max-w-7xl mx-auto">
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4 mr-2" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!plant) {
    return (
      <div className="container px-4 py-8 max-w-7xl mx-auto">
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4 mr-2" />
          <AlertTitle>No Plant Found</AlertTitle>
          <AlertDescription>Please add a plant first to see the health diagnosis demo.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container px-4 py-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Health Diagnosis Demo</h1>
        <p className="text-muted-foreground">
          This page demonstrates how plant health diagnoses appear in the care timeline.
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{plant.name}</CardTitle>
            <CardDescription>{plant.type || 'No plant type information'}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-lg">Care Timeline with Health Diagnosis</h3>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="gap-1.5"
                  onClick={refreshData}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Refresh Data
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="gap-1.5"
                  onClick={createSampleHealthDiagnosis}
                  disabled={isCreatingHealthLog}
                >
                  {isCreatingHealthLog ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="h-3.5 w-3.5" />
                      Add Sample Health Check
                    </>
                  )}
                </Button>
              </div>
            </div>
            
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-md mb-4 text-sm">
              <p className="flex items-center text-amber-800 font-medium mb-1">
                <RefreshCw className="h-4 w-4 mr-1.5" /> Demo Instructions
              </p>
              <p className="text-amber-700 mb-2">
                Click the "Add Sample Health Check" button above to create a sample health diagnosis 
                log for this plant. This demonstrates how health issues would appear in the care timeline.
              </p>
              <p className="text-amber-700 mb-2">
                Use the "Refresh Data" button if you'd like to reload the timeline after adding health logs.
              </p>
              <p className="text-amber-700 text-xs">
                Each click will randomly generate one of several sample health diagnoses - including fungal infections, 
                pest infestations, and nutrient deficiencies - with varying severity levels. Each diagnosis includes 
                detailed information about the cause, recommended solution, and prevention tips.
                In a real scenario, these diagnoses would be generated from photos of your actual plants.
              </p>
            </div>
            
            <CareTimeline plant={plant} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}