import { CommunityInsights } from "@/components/ai-tools/CommunityInsights";
import { MainLayout } from "@/components/layouts/MainLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users } from "lucide-react";
import { Link } from "wouter";

export default function CommunityInsightsPage() {
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
            <Users className="mr-2 h-7 w-7 text-pink-500" />
            Community Insights
          </h1>
        </div>
        
        <p className="text-muted-foreground mb-8">
          Discover best practices from the plant care community.
          Our AI assistant analyzes collective wisdom to provide insights on
          watering, light, soil, common issues, and success patterns for different plants.
        </p>
        
        <CommunityInsights />
      </div>
    </MainLayout>
  );
}