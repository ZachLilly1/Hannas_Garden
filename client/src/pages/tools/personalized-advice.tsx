import { PersonalizedPlantAdvisor } from "@/components/ai-tools/PersonalizedPlantAdvisor";
import { MainLayout } from "@/components/layouts/MainLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Brain } from "lucide-react";
import { Link } from "wouter";

export default function PersonalizedAdvicePage() {
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
            <Brain className="mr-2 h-7 w-7 text-purple-500" />
            Personalized Plant Advisor
          </h1>
        </div>
        
        <p className="text-muted-foreground mb-8">
          Get customized care recommendations tailored to your specific plants and environment.
          Our AI assistant analyzes your plant's needs, care history, and current conditions to provide
          personalized advice.
        </p>
        
        <PersonalizedPlantAdvisor />
      </div>
    </MainLayout>
  );
}