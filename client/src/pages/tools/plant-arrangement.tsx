import { PlantArrangementDesigner } from "@/components/ai-tools/PlantArrangementDesigner";
import { MainLayout } from "@/components/layouts/MainLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, PanelTop } from "lucide-react";
import { Link } from "wouter";

export default function PlantArrangementPage() {
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
            <PanelTop className="mr-2 h-7 w-7 text-teal-500" />
            Plant Arrangement Designer
          </h1>
        </div>
        
        <p className="text-muted-foreground mb-8">
          Get suggestions for arranging your plants aesthetically and functionally in any space.
          Our AI assistant helps you create beautiful plant displays while considering light,
          humidity, and care requirements.
        </p>
        
        <PlantArrangementDesigner />
      </div>
    </MainLayout>
  );
}