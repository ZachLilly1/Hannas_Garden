import { SeasonalCareGuide } from "@/components/ai-tools/SeasonalCareGuide";
import { MainLayout } from "@/components/layouts/MainLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CloudSun } from "lucide-react";
import { Link } from "wouter";

export default function SeasonalCarePage() {
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
            <CloudSun className="mr-2 h-7 w-7 text-blue-500" />
            Seasonal Care Guide
          </h1>
        </div>
        
        <p className="text-muted-foreground mb-8">
          Optimize your plant care based on the current season and your location.
          Our AI assistant provides detailed recommendations for adapting your care routine throughout the year.
        </p>
        
        <SeasonalCareGuide />
      </div>
    </MainLayout>
  );
}