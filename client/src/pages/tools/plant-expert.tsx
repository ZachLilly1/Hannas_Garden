import { PlantCareExpert } from "@/components/ai-tools/PlantCareExpert";
import { MainLayout } from "@/components/layouts/MainLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Search } from "lucide-react";
import { Link } from "wouter";

export default function PlantExpertPage() {
  return (
    <MainLayout>
      <div className="container max-w-4xl px-4 py-8">
        <div className="flex items-center mb-2">
          <Link href="/tools">
            <Button variant="ghost" size="sm" className="mr-2 h-8 w-8 p-0">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back</span>
            </Button>
          </Link>
          <h1 className="text-3xl font-bold flex items-center">
            <Search className="mr-2 h-7 w-7 text-amber-500" />
            Plant Care Expert
          </h1>
        </div>
        
        <p className="text-muted-foreground mb-8">
          Ask questions and get expert answers about plant care.
          Our AI assistant provides detailed guidance on plant issues,
          care techniques, and solutions to common problems.
        </p>
        
        <PlantCareExpert />
      </div>
    </MainLayout>
  );
}