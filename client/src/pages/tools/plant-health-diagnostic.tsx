import { PlantHealthDiagnostic } from "@/components/tools/PlantHealthDiagnostic";

export default function PlantHealthDiagnosticPage() {
  return (
    <div className="container px-4 py-8 max-w-7xl mx-auto">
    
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Plant Health Diagnostic</h1>
        <p className="text-muted-foreground">
          Analyze your plant's health issues by taking or uploading a photo. 
          Get AI-powered diagnosis, treatment recommendations, and prevention tips.
        </p>
      </div>
      
      <PlantHealthDiagnostic />
    </div>
  );
}