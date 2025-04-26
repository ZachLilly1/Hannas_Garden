import { PlantIdentifier } from "@/components/tools/PlantIdentifier";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { InsertPlant } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export default function PlantIdentifierPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Mutation to add plant to collection
  const addPlantMutation = useMutation({
    mutationFn: async (plantData: Partial<InsertPlant>) => {
      try {
        const res = await apiRequest("POST", "/api/plants", plantData);
        if (!res.ok) {
          const errorData = await res.json();
          console.error("Server error:", errorData);
          throw new Error(errorData.message || "Failed to add plant");
        }
        return res.json();
      } catch (err) {
        console.error("Plant creation error:", err);
        throw err;
      }
    },
    onSuccess: () => {
      // Invalidate plants query to refetch
      queryClient.invalidateQueries({ queryKey: ["/api/plants"] });
      
      toast({
        title: "Plant added to collection",
        description: "Your plant has been added to your collection",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add plant",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle adding a plant to collection
  const handleAddToCollection = (plantData: Partial<InsertPlant>) => {
    addPlantMutation.mutate(plantData);
  };

  return (
    <div className="container px-4 py-8 max-w-7xl mx-auto">
    
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Plant Identifier</h1>
        <p className="text-muted-foreground">
          Take or upload a photo of a plant to identify it and get care recommendations.
          If you like, you can add the identified plant to your collection.
        </p>
      </div>
      
      <PlantIdentifier onAddToCollection={handleAddToCollection} />
    </div>
  );
}