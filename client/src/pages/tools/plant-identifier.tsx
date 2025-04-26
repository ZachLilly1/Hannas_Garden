import { PlantIdentifier } from "@/components/tools/PlantIdentifier";

export default function PlantIdentifierPage() {
  return (
    <div className="container px-4 py-8 max-w-7xl mx-auto">
    
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Plant Identifier</h1>
        <p className="text-muted-foreground">
          Take or upload a photo of a plant to identify it and get care recommendations.
        </p>
      </div>
      
      <PlantIdentifier />
    </div>
  );
}