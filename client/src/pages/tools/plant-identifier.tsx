import { PlantIdentifier } from "@/components/tools/PlantIdentifier";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { InsertPlant } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink } from "@/components/ui/breadcrumb";
import { HomeIcon } from "lucide-react";

export default function PlantIdentifierPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Mutation to add plant to collection
  const addPlantMutation = useMutation({
    mutationFn: async (plantData: Partial<InsertPlant>) => {
      const res = await apiRequest("POST", "/api/plants", plantData);
      return res.json();
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
      <Breadcrumb className="mb-6">
        <BreadcrumbItem>
          <BreadcrumbLink href="/">
            <HomeIcon className="h-4 w-4 mr-1" />
            Home
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbItem>
          <BreadcrumbLink href="/tools">
            Tools
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbItem>
          <span>Plant Identifier</span>
        </BreadcrumbItem>
      </Breadcrumb>
    
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