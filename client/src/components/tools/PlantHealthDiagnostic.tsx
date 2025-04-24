import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Camera, Upload, X, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Types for plant health diagnosis from OpenAI
interface PlantHealthDiagnosis {
  issue: string;
  cause: string;
  solution: string;
  preventionTips: string[];
  severity: "low" | "medium" | "high";
  confidenceLevel: "low" | "medium" | "high";
}

export function PlantHealthDiagnostic() {
  const [image, setImage] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Clear the selected image
  const clearImage = () => {
    setImage(null);
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Handle image file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({
          title: "File too large",
          description: "Please select an image smaller than 10MB",
          variant: "destructive",
        });
        return;
      }
      
      const reader = new FileReader();
      
      reader.onloadend = () => {
        const base64String = reader.result as string;
        // Extract the base64 data part (remove the data:image/jpeg;base64, prefix)
        const base64Data = base64String.split(',')[1];
        setImage(base64Data);
        setPreview(base64String);
      };
      
      reader.readAsDataURL(file);
    }
  };

  // Handle camera capture on mobile
  const handleCameraCapture = () => {
    if (fileInputRef.current) {
      // Setting capture attribute dynamically for camera
      fileInputRef.current.setAttribute('capture', 'environment');
      fileInputRef.current.click();
    }
  };

  // Handle upload button click
  const handleUploadClick = () => {
    if (fileInputRef.current) {
      // Remove capture attribute to ensure gallery opens instead of camera
      fileInputRef.current.removeAttribute('capture');
      fileInputRef.current.click();
    }
  };

  // Mutation for diagnosing plant health
  const diagnosisMutation = useMutation({
    mutationFn: async (imageBase64: string) => {
      const res = await apiRequest('POST', '/api/diagnose-plant-health', { imageBase64 });
      const data: PlantHealthDiagnosis = await res.json();
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Plant diagnosis complete!",
        description: `Issue identified: ${data.issue}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Diagnosis failed",
        description: error.message || "Please try again with a clearer image",
        variant: "destructive",
      });
    },
  });

  // Diagnose the plant health from the image
  const diagnosePlantHealth = () => {
    if (!image) {
      toast({
        title: "No image selected",
        description: "Please take or upload a photo of your plant first",
        variant: "destructive",
      });
      return;
    }
    
    diagnosisMutation.mutate(image);
  };

  // Helper function to get severity badge color
  const getSeverityColor = (severity: "low" | "medium" | "high") => {
    switch (severity) {
      case "low": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "medium": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "high": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default: return "";
    }
  };

  // Helper function to get confidence badge color
  const getConfidenceColor = (confidence: "low" | "medium" | "high") => {
    switch (confidence) {
      case "high": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "medium": return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
      case "low": return "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300";
      default: return "";
    }
  };

  // Helper function to get severity icon
  const getSeverityIcon = (severity: "low" | "medium" | "high") => {
    switch (severity) {
      case "low": return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "medium": return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case "high": return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default: return null;
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Card className="shadow-md">
        <CardContent className="space-y-4 pt-6">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          
          {/* Image preview area */}
          <div className="relative aspect-video w-full bg-zinc-100 dark:bg-zinc-800 rounded-lg overflow-hidden flex items-center justify-center">
            {preview ? (
              <>
                <img
                  src={preview}
                  alt="Plant preview"
                  className="h-full w-full object-contain"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8 rounded-full"
                  onClick={clearImage}
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <div className="text-center p-8">
                <div className="mx-auto h-12 w-12 text-muted-foreground mb-2">
                  <Camera className="h-12 w-12" />
                </div>
                <p className="text-muted-foreground">
                  No image selected
                </p>
              </div>
            )}
          </div>
          
          {/* Camera/Upload buttons */}
          <div className="flex gap-3 mt-4">
            <Button 
              variant="outline" 
              className="flex-1" 
              onClick={handleCameraCapture}
            >
              <Camera className="mr-2 h-4 w-4" />
              Take Photo
            </Button>
            <Button 
              variant="outline" 
              className="flex-1" 
              onClick={handleUploadClick}
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload Image
            </Button>
          </div>
          
          {/* Diagnosis button */}
          <Button 
            className="w-full mt-4"
            onClick={diagnosePlantHealth}
            disabled={!image || diagnosisMutation.isPending}
          >
            {diagnosisMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : "Diagnose Plant Health"}
          </Button>
          
          {/* Diagnosis results */}
          {diagnosisMutation.data && (
            <div className="mt-6 rounded-lg border p-4 bg-background">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2">
                  {getSeverityIcon(diagnosisMutation.data.severity)}
                  <div>
                    <h3 className="text-lg font-semibold">{diagnosisMutation.data.issue}</h3>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Badge variant="outline" className={getSeverityColor(diagnosisMutation.data.severity)}>
                    {diagnosisMutation.data.severity.charAt(0).toUpperCase() + diagnosisMutation.data.severity.slice(1)} severity
                  </Badge>
                  <Badge variant="outline" className={getConfidenceColor(diagnosisMutation.data.confidenceLevel)}>
                    {diagnosisMutation.data.confidenceLevel.charAt(0).toUpperCase() + diagnosisMutation.data.confidenceLevel.slice(1)} confidence
                  </Badge>
                </div>
              </div>
              
              <Separator className="my-4" />
              
              <Tabs defaultValue="diagnosis" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="diagnosis">Diagnosis</TabsTrigger>
                  <TabsTrigger value="solution">Solution</TabsTrigger>
                  <TabsTrigger value="prevention">Prevention</TabsTrigger>
                </TabsList>
                <TabsContent value="diagnosis" className="p-4 rounded-md bg-zinc-50 dark:bg-zinc-900 mt-2">
                  <h4 className="font-medium mb-2">Cause</h4>
                  <p className="text-sm whitespace-pre-line">{diagnosisMutation.data.cause}</p>
                </TabsContent>
                <TabsContent value="solution" className="p-4 rounded-md bg-zinc-50 dark:bg-zinc-900 mt-2">
                  <h4 className="font-medium mb-2">Treatment Steps</h4>
                  <p className="text-sm whitespace-pre-line">{diagnosisMutation.data.solution}</p>
                </TabsContent>
                <TabsContent value="prevention" className="p-4 rounded-md bg-zinc-50 dark:bg-zinc-900 mt-2">
                  <h4 className="font-medium mb-2">Prevention Tips</h4>
                  <ul className="text-sm list-disc pl-5 space-y-1">
                    {diagnosisMutation.data.preventionTips.map((tip, index) => (
                      <li key={index}>{tip}</li>
                    ))}
                  </ul>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}