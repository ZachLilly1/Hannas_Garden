import { GrowthAnalyzer } from "@/components/ai-tools/GrowthAnalyzer";
import { MainLayout } from "@/components/layouts/MainLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BarChart } from "lucide-react";
import { Link } from "wouter";

export default function GrowthAnalyzerPage() {
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
            <BarChart className="mr-2 h-7 w-7 text-emerald-500" />
            Growth Analyzer
          </h1>
        </div>
        
        <p className="text-muted-foreground mb-8">
          Track and analyze your plant's growth over time using AI image analysis.
          Upload photos taken at different times to get detailed insights on growth rate,
          health changes, and recommendations for optimal care.
        </p>
        
        <GrowthAnalyzer />
      </div>
    </MainLayout>
  );
}