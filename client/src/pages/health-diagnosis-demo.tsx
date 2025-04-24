import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlantWithCare } from '@shared/schema';
import { CareTimeline } from '@/components/plants/CareTimeline';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { AlertCircle, Loader2, Plus, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

/**
 * This is a demonstration page that shows how the health diagnosis appears
 * in the care timeline.
 */
export default function HealthDiagnosisDemo() {
  const [plant, setPlant] = useState<PlantWithCare | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
            <h3 className="font-medium text-lg mb-4">Care Timeline with Health Diagnosis</h3>
            <CareTimeline plant={plant} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}