import { CareScheduleOptimizer } from "@/components/ai-tools/CareScheduleOptimizer";
import { MainLayout } from "@/components/layouts/MainLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar } from "lucide-react";
import { Link } from "wouter";

export default function CareSchedulerPage() {
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
            <Calendar className="mr-2 h-7 w-7 text-orange-500" />
            Care Schedule Optimizer
          </h1>
        </div>
        
        <p className="text-muted-foreground mb-8">
          Generate an optimized care schedule for your entire plant collection.
          Our AI assistant creates an efficient weekly routine based on your availability 
          and each plant's specific needs.
        </p>
        
        <CareScheduleOptimizer />
      </div>
    </MainLayout>
  );
}