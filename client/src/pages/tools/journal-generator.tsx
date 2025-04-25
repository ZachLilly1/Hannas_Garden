import { JournalWritingAssistant } from "@/components/ai-tools/JournalWritingAssistant";
import { MainLayout } from "@/components/layouts/MainLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen } from "lucide-react";
import { Link } from "wouter";

export default function JournalGeneratorPage() {
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
            <BookOpen className="mr-2 h-7 w-7 text-indigo-500" />
            Journal Writing Assistant
          </h1>
        </div>
        
        <p className="text-muted-foreground mb-8">
          Transform your basic care logs into detailed, insightful journal entries.
          This AI assistant analyzes your care data and enriches it with observations,
          growth analysis, and next steps to create comprehensive plant journal entries.
        </p>
        
        <JournalWritingAssistant />
      </div>
    </MainLayout>
  );
}