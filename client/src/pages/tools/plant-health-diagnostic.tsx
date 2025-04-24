import { PlantHealthDiagnostic } from "@/components/tools/PlantHealthDiagnostic";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink } from "@/components/ui/breadcrumb";
import { HomeIcon } from "lucide-react";

export default function PlantHealthDiagnosticPage() {
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
          <span>Plant Health Diagnostic</span>
        </BreadcrumbItem>
      </Breadcrumb>
    
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Plant Health Diagnostic</h1>
        <p className="text-muted-foreground">
          Analyze your plant's health issues by taking or uploading a photo. 
          Get AI-powered diagnosis, treatment recommendations, and prevention tips.
        </p>
      </div>
      
      <PlantHealthDiagnostic />
    </div>
  );
}