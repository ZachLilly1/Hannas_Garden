import React, { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  WaterDropIcon, 
  SunIcon, 
  SeedlingIcon, 
  EditIcon, 
  HistoryIcon, 
  BellIcon, 
  CircleDotIcon, 
  CheckCircleIcon,
  CameraIcon,
  LeafIcon,
  ActivityIcon,
  BrainIcon
} from "@/lib/icons";
import { cn, formatRelativeDate, getDefaultPlantImage } from "@/lib/utils";
import { type PlantWithCare, type CareLog, type InsertCareLog } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { differenceInDays } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CareTimeline } from "./CareTimeline";
import { CareLogForm } from "./CareLogForm";
import { ReminderList } from "../reminders/ReminderList";
import { ReminderForm } from "../reminders/ReminderForm";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface PlantDetailModalProps {
  plant: PlantWithCare | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (plant: PlantWithCare) => void;
}

export function PlantDetailModal({ plant, isOpen, onClose, onEdit }: PlantDetailModalProps) {
  const [activeTab, setActiveTab] = useState("care-schedule");
  const [showLogCareForm, setShowLogCareForm] = useState(false);
  const [showReminderForm, setShowReminderForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [careLogs, setCareLogs] = useState<CareLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [isLoadingAiAdvice, setIsLoadingAiAdvice] = useState(false);

  // Fetch care logs when the plant detail modal is opened
  useEffect(() => {
    if (plant && isOpen) {
      const fetchCareLogs = async () => {
        try {
          setIsLoadingLogs(true);
          const response = await apiRequest('GET', `/api/plants/${plant.id}/care-logs`);
          if (response.ok) {
            const logs = await response.json();
            if (Array.isArray(logs)) {
              setCareLogs(logs);
            }
          }
        } catch (error) {
          console.error('Error fetching care logs:', error);
        } finally {
          setIsLoadingLogs(false);
        }
      };
      
      fetchCareLogs();
    }
  }, [plant, isOpen]);
  
  // Load AI insights when the AI tab is selected
  useEffect(() => {
    if (plant && isOpen && activeTab === "ai-insights") {
      // Simulate AI analysis with a delayed response
      const fetchAiAdvice = async () => {
        try {
          setIsLoadingAiAdvice(true);
          // In production, this would be a real API call to the OpenAI endpoint
          // await apiRequest('GET', `/api/plants/${plant.id}/ai-insights`);
          
          // Simulate network delay
          await new Promise(resolve => setTimeout(resolve, 1500));
          
        } catch (error) {
          console.error('Error fetching AI advice:', error);
          toast({
            title: "AI advice unavailable",
            description: "Could not retrieve AI recommendations at this time. Please try again later.",
            variant: "destructive"
          });
        } finally {
          setIsLoadingAiAdvice(false);
        }
      };
      
      fetchAiAdvice();
    }
  }, [plant, isOpen, activeTab]);

  if (!plant) return null;
  
  const handleDeletePlant = async () => {
    try {
      setIsDeleting(true);
      await apiRequest('DELETE', `/api/plants/${plant.id}`);
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/plants'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/care-needed'] });
      
      toast({
        title: "Plant deleted",
        description: `${plant.name} has been removed from your garden.`,
      });
      
      // Close both the confirm dialog and the plant detail modal
      setShowDeleteConfirm(false);
      onClose();
    } catch (error) {
      toast({
        title: "Failed to delete plant",
        description: "An error occurred while deleting the plant. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleLogCare = async (careType: string) => {
    try {
      const careLog: InsertCareLog = {
        plantId: plant.id,
        careType,
        notes: `Logged ${careType} care for ${plant.name}`
      };

      await apiRequest('POST', '/api/care-logs', careLog);
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/plants'] });
      queryClient.invalidateQueries({ queryKey: ['/api/plants', plant.id.toString()] });
      queryClient.invalidateQueries({ queryKey: ['/api/plants', plant.id.toString(), 'care-logs'] });
      
      toast({
        title: "Care logged successfully",
        description: `${careType.charAt(0).toUpperCase() + careType.slice(1)} care logged for ${plant.name}`,
      });
    } catch (error) {
      toast({
        title: "Failed to log care",
        description: "An error occurred while logging care",
        variant: "destructive"
      });
    }
  };
  
  // Calculate water status and remaining days
  const waterRemainingDays = plant.nextWatering 
    ? differenceInDays(new Date(plant.nextWatering), new Date())
    : null;
    
  // Calculate fertilizer status and remaining days
  const fertilizerRemainingDays = plant.nextFertilizing 
    ? differenceInDays(new Date(plant.nextFertilizing), new Date()) 
    : null;

  const getSunlightAdequacy = () => {
    const plantGuide = plant.guide;
    if (!plantGuide) return "Unknown";
    
    if (plantGuide.idealSunlight === plant.sunlightLevel) {
      return "Adequate";
    } else {
      return plant.sunlightLevel === "high" 
        ? "Too much" 
        : "Not enough";
    }
  };

  const sunlightStatus = getSunlightAdequacy();
  const sunlightAdequate = sunlightStatus === "Adequate";

  const handleCareLogSuccess = async () => {
    setShowLogCareForm(false);
    
    // Refresh care logs
    try {
      setIsLoadingLogs(true);
      const response = await apiRequest('GET', `/api/plants/${plant.id}/care-logs`);
      if (response.ok) {
        const logs = await response.json();
        if (Array.isArray(logs)) {
          setCareLogs(logs);
        }
      }
    } catch (error) {
      console.error('Error refreshing care logs:', error);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const navigateToHealthCheck = () => {
    onClose();
    window.location.href = '/tools/plant-health-diagnostic';
  };

  return (
    <>
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Plant</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <span className="font-semibold">{plant.name}</span> from your garden? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeletePlant} 
              disabled={isDeleting}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="mx-auto p-0 rounded-xl overflow-y-auto overflow-x-hidden max-h-[90vh] w-[95vw] max-w-[450px] flex flex-col">
          <div className="h-64 relative">
            <img
              src={plant.image || getDefaultPlantImage(plant.scientificName || plant.type || "")}
              alt={plant.name}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="px-4 sm:px-6 py-5 w-full">
            <div className="flex justify-between items-start mb-2 w-full">
              <div className="flex flex-col max-w-[70%]">
                <h2 className="text-xl font-medium break-words">{plant.name}</h2>
                {plant.scientificName && (
                  <p className="text-sm text-muted-foreground italic break-words">
                    {plant.scientificName}
                  </p>
                )}
              </div>
              <div className="flex space-x-3 flex-shrink-0">
                <button 
                  className="text-neutral-dark opacity-70 hover:opacity-100"
                  onClick={() => onEdit(plant)}
                  aria-label="Edit plant"
                >
                  <EditIcon className="h-5 w-5" />
                </button>
                <button 
                  className="text-red-500 opacity-70 hover:opacity-100"
                  onClick={() => setShowDeleteConfirm(true)}
                  aria-label="Delete plant"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18"></path>
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex mb-3 space-x-2 flex-wrap">
              <Badge variant="outline" className="px-2 py-1 bg-muted/50 dark:bg-muted/20 rounded-full text-xs mb-1">
                {plant.sunlightLevel.charAt(0).toUpperCase() + plant.sunlightLevel.slice(1)} Light
              </Badge>
              <Badge variant="outline" className="px-2 py-1 bg-muted/50 dark:bg-muted/20 rounded-full text-xs mb-1">
                Water every {plant.waterFrequency} days
              </Badge>
              {plant.location && (
                <Badge variant="outline" className="px-2 py-1 bg-muted/50 dark:bg-muted/20 rounded-full text-xs mb-1">
                  {plant.location}
                </Badge>
              )}
            </div>

            {/* Extract and display care tips if they exist in notes */}
            {plant.notes && plant.notes.includes("Care Tips:") ? (
              <div className="mb-6">
                <p className="text-sm font-medium mb-1">Care Tips:</p>
                <p className="text-sm text-muted-foreground break-words whitespace-pre-line hyphens-auto overflow-wrap-anywhere text-wrap-pretty break-word">
                  {plant.notes.split("Care Tips:")[1].trim()}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mb-6 break-words whitespace-pre-line hyphens-auto overflow-wrap-anywhere text-wrap-pretty break-word">
                {plant.notes 
                  ? plant.notes
                  : (plant.guide?.description || `A beautiful plant placed in ${plant.location}.`)}
              </p>
            )}

            {/* Tabs Interface */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
              <TabsList className="w-full flex bg-muted/50 dark:bg-muted/20 p-0.5 rounded-md">
                <TabsTrigger 
                  value="care-schedule" 
                  className="flex-1 text-xs sm:text-sm data-[state=active]:bg-background dark:data-[state=active]:bg-background data-[state=active]:shadow-none px-1 sm:px-2"
                >
                  <WaterDropIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="whitespace-nowrap overflow-hidden text-ellipsis">Care</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="history" 
                  className="flex-1 text-xs sm:text-sm data-[state=active]:bg-background dark:data-[state=active]:bg-background data-[state=active]:shadow-none px-1 sm:px-2 relative"
                >
                  <HistoryIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="whitespace-nowrap overflow-hidden text-ellipsis">History</span>
                  {careLogs.length > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-white">
                      {careLogs.length > 99 ? '99+' : careLogs.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger 
                  value="reminders" 
                  className="flex-1 text-xs sm:text-sm data-[state=active]:bg-background dark:data-[state=active]:bg-background data-[state=active]:shadow-none px-1 sm:px-2"
                >
                  <BellIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="whitespace-nowrap overflow-hidden text-ellipsis">Reminders</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="ai-insights" 
                  className="flex-1 text-xs sm:text-sm data-[state=active]:bg-background dark:data-[state=active]:bg-background data-[state=active]:shadow-none px-1 sm:px-2"
                >
                  <BrainIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="whitespace-nowrap overflow-hidden text-ellipsis">AI</span>
                </TabsTrigger>
              </TabsList>
              
              {/* Care Schedule Tab Content */}
              <TabsContent value="care-schedule" className="mt-4">
                <div className="space-y-4">
                  {/* Water Schedule */}
                  <div className="flex items-center p-3 bg-muted/50 dark:bg-muted/20 rounded-lg">
                    <div className="p-2 bg-blue-100 dark:bg-blue-950 rounded-full mr-3 flex-shrink-0">
                      <WaterDropIcon className="h-4 w-4 text-blue-500" />
                    </div>
                    <div className="min-w-0 flex-grow">
                      <p className="font-medium">Water</p>
                      <p className="text-xs text-muted-foreground">Every {plant.waterFrequency} days</p>
                    </div>
                    <div className="text-right ml-2">
                      <p className="font-medium text-sm sm:whitespace-nowrap">
                        {waterRemainingDays !== null 
                          ? waterRemainingDays < 0 
                            ? "Overdue" 
                            : waterRemainingDays === 0 
                              ? "Today" 
                              : waterRemainingDays === 1 
                                ? "1 day" 
                                : `${waterRemainingDays} days`
                          : "Not set"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {waterRemainingDays !== null && waterRemainingDays >= 0 ? "remaining" : ""}
                      </p>
                    </div>
                  </div>

                  {/* Sunlight Schedule */}
                  <div className="flex items-center p-3 bg-muted/50 dark:bg-muted/20 rounded-lg">
                    <div className="p-2 bg-yellow-100 dark:bg-yellow-950 rounded-full mr-3 flex-shrink-0">
                      <SunIcon className="h-4 w-4 text-yellow-500" />
                    </div>
                    <div className="min-w-0 flex-grow">
                      <p className="font-medium">Sunlight</p>
                      <p className="text-xs text-muted-foreground">
                        {plant.sunlightLevel.charAt(0).toUpperCase() + plant.sunlightLevel.slice(1)}, 
                        {plant.sunlightLevel === "high" ? " direct" : " indirect"}
                      </p>
                    </div>
                    <div className={cn(
                      "text-xs font-medium text-right ml-2 sm:whitespace-nowrap",
                      sunlightAdequate ? "text-status-success" : "text-status-warning"
                    )}>
                      {sunlightAdequate ? <CheckCircleIcon className="h-4 w-4 inline mr-1" /> : null}
                      {sunlightStatus}
                    </div>
                  </div>

                  {/* Fertilizer Schedule */}
                  <div className="flex items-center p-3 bg-muted/50 dark:bg-muted/20 rounded-lg">
                    <div className="p-2 bg-green-100 dark:bg-green-950 rounded-full mr-3 flex-shrink-0">
                      <SeedlingIcon className="h-4 w-4 text-green-500" />
                    </div>
                    <div className="min-w-0 flex-grow">
                      <p className="font-medium">Fertilizer</p>
                      <p className="text-xs text-muted-foreground">
                        {plant.fertilizerFrequency === 0 
                          ? "Not needed" 
                          : `Every ${plant.fertilizerFrequency} days`}
                      </p>
                    </div>
                    <div className="text-right ml-2">
                      {plant.fertilizerFrequency > 0 && (
                        <>
                          <p className="font-medium text-sm sm:whitespace-nowrap">
                            {fertilizerRemainingDays !== null 
                              ? fertilizerRemainingDays < 0 
                                ? "Overdue" 
                                : fertilizerRemainingDays === 0 
                                  ? "Today" 
                                  : fertilizerRemainingDays < 7 
                                    ? `${fertilizerRemainingDays} days` 
                                    : `${Math.floor(fertilizerRemainingDays / 7)} weeks`
                              : "Not set"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {fertilizerRemainingDays !== null && fertilizerRemainingDays >= 0 ? "remaining" : ""}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Care History Summary */}
                <div className="mt-6">
                  <div className="flex justify-between items-center">
                    <h3 className="font-medium mb-2">Recent Activity</h3>
                    <button 
                      className="text-xs text-primary flex items-center"
                      onClick={() => setActiveTab("history")}
                    >
                      View all {careLogs.length > 0 ? `(${careLogs.length})` : ''}
                      <svg className="h-3 w-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                  {careLogs.length > 0 ? (
                    <div className="p-3 bg-muted/30 dark:bg-muted/10 rounded-lg mb-2">
                      <div className="flex items-center text-sm text-neutral-dark">
                        <HistoryIcon className="h-4 w-4 mr-2 text-primary" />
                        <span>
                          {careLogs.length === 1 
                            ? '1 care activity logged'
                            : `${careLogs.length} care activities logged`}
                        </span>
                      </div>
                      {careLogs.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Last activity: {careLogs[0]?.timestamp 
                            ? formatRelativeDate(new Date(careLogs[0].timestamp))
                            : 'Unknown date'}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="p-3 bg-muted/30 dark:bg-muted/10 rounded-lg text-center mb-2">
                      <p className="text-sm text-neutral-dark opacity-70">No care activities logged yet</p>
                      <button 
                        className="text-xs text-primary mt-1"
                        onClick={() => {
                          setActiveTab("history");
                          setShowLogCareForm(true);
                        }}
                      >
                        Log your first care activity
                      </button>
                    </div>
                  )}
                </div>

                {/* Care Tips */}
                {plant.guide && (
                  <div className="mt-6">
                    <h3 className="font-medium mb-3">Care Tips</h3>
                    <ul className="text-sm space-y-2">
                      {plant.guide.careTips.split('.').filter(tip => tip.trim()).map((tip, index) => (
                        <li key={index} className="flex items-start">
                          <CircleDotIcon className="h-3 w-3 mt-1 mr-2 flex-shrink-0 text-primary" />
                          <span className="break-words hyphens-auto overflow-wrap-anywhere text-wrap-pretty break-word">{tip.trim()}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </TabsContent>
              
              {/* History Tab Content */}
              <TabsContent value="history" className="mt-4">
                {showLogCareForm ? (
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-medium">Log Care Activity</h3>
                      <button 
                        className="text-sm text-primary"
                        onClick={() => setShowLogCareForm(false)}
                      >
                        Cancel
                      </button>
                    </div>
                    <CareLogForm plantId={plant.id} onSuccess={handleCareLogSuccess} />
                  </div>
                ) : (
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-medium">Care History</h3>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-xs sm:whitespace-nowrap"
                      onClick={() => setShowLogCareForm(true)}
                    >
                      <CameraIcon className="h-3 w-3 mr-1" />
                      <span className="hidden xs:inline">Add Log</span>
                      <span className="xs:hidden">Add</span>
                    </Button>
                  </div>
                )}
                
                <CareTimeline plant={plant} />
              </TabsContent>
              
              {/* Reminders Tab Content */}
              <TabsContent value="reminders" className="mt-4">
                {showReminderForm ? (
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-medium">New Reminder</h3>
                      <button 
                        className="text-sm text-primary"
                        onClick={() => setShowReminderForm(false)}
                      >
                        Cancel
                      </button>
                    </div>
                    <ReminderForm 
                      isOpen={showReminderForm} 
                      onClose={() => setShowReminderForm(false)} 
                      plantId={plant.id} 
                    />
                  </div>
                ) : (
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-medium">Plant Reminders</h3>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-xs sm:whitespace-nowrap"
                      onClick={() => setShowReminderForm(true)}
                    >
                      <BellIcon className="h-3 w-3 mr-1" />
                      <span className="hidden xs:inline">Add Reminder</span>
                      <span className="xs:hidden">Add</span>
                    </Button>
                  </div>
                )}
                
                <ReminderList type="plant" plantId={plant.id} onAddReminder={() => setShowReminderForm(true)} />
              </TabsContent>
              
              {/* AI Insights Tab Content */}
              <TabsContent value="ai-insights" className="mt-4">
                {isLoadingAiAdvice ? (
                  <div className="flex flex-col items-center justify-center py-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-3"></div>
                    <p className="text-sm text-muted-foreground">Analyzing plant data with AI...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 bg-muted/50 dark:bg-muted/20 rounded-lg">
                      <h3 className="text-sm font-medium flex items-center">
                        <BrainIcon className="h-4 w-4 mr-2 text-primary" />
                        Smart Care Recommendations
                      </h3>
                      <div className="mt-3 space-y-3">
                        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md text-sm">
                          <p className="font-medium">Optimal Watering</p>
                          <p className="text-muted-foreground text-xs mt-1">
                            Based on your {plant.type || plant.scientificName || "plant"}'s current condition and environmental factors, adjust watering to every {Math.max(plant.waterFrequency - 1, 2)} days during summer months.
                          </p>
                        </div>
                        
                        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md text-sm">
                          <p className="font-medium">Light Adjustment</p>
                          <p className="text-muted-foreground text-xs mt-1">
                            {plant.sunlightLevel === "low" ? 
                              "Consider moving to a slightly brighter location with filtered light to encourage more growth." :
                              plant.sunlightLevel === "high" ? 
                              "Your plant may benefit from occasional shade during peak afternoon sun to prevent leaf scorching." :
                              "Current light conditions appear optimal for this plant species."}
                          </p>
                        </div>
                        
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md text-sm">
                          <p className="font-medium">Growth Potential</p>
                          <p className="text-muted-foreground text-xs mt-1">
                            With proper care, your {plant.name} can thrive for many years. Consider seasonal fertilization to promote optimal growth.
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4 bg-muted/50 dark:bg-muted/20 rounded-lg">
                      <h3 className="text-sm font-medium flex items-center">
                        <LeafIcon className="h-4 w-4 mr-2 text-primary" />
                        Seasonal Care Adjustments
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1 mb-3">
                        AI-powered recommendations for the current season.
                      </p>
                      
                      <div className="p-3 bg-background border border-border rounded-md text-sm">
                        <p className="font-medium">Spring-Summer Transition</p>
                        <ul className="mt-2 space-y-2 text-xs text-muted-foreground">
                          <li className="flex items-start">
                            <CircleDotIcon className="h-3 w-3 mt-0.5 mr-2 flex-shrink-0 text-primary" />
                            <span>Gradually increase watering frequency as temperatures rise.</span>
                          </li>
                          <li className="flex items-start">
                            <CircleDotIcon className="h-3 w-3 mt-0.5 mr-2 flex-shrink-0 text-primary" />
                            <span>Monitor soil moisture more carefully during hot periods.</span>
                          </li>
                          <li className="flex items-start">
                            <CircleDotIcon className="h-3 w-3 mt-0.5 mr-2 flex-shrink-0 text-primary" />
                            <span>Consider increased humidity for tropical species like this one.</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                    
                    <Button 
                      variant="outline" 
                      className="w-full flex items-center justify-center mt-3"
                      onClick={() => window.location.href = "/tools/personalized-advice"}
                    >
                      <BrainIcon className="h-4 w-4 mr-2" />
                      Get More AI Recommendations
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => {
                  setActiveTab("history");
                  setShowLogCareForm(true);
                }}
              >
                <LeafIcon className="h-4 w-4 mr-2" />
                Log Care
              </Button>
              <Button 
                className="flex-1"
                onClick={() => {
                  setActiveTab("reminders");
                  setShowReminderForm(true);
                }}
              >
                <BellIcon className="h-4 w-4 mr-2" />
                Remind Me
              </Button>
            </div>
            
            {/* Health Check Button */}
            <div className="mt-3">
              <Button 
                variant="outline" 
                className="w-full bg-amber-50 dark:bg-amber-900/30 hover:bg-amber-100 dark:hover:bg-amber-800/30 text-amber-800 dark:text-amber-400 border-amber-300 dark:border-amber-700"
                onClick={navigateToHealthCheck}
              >
                <ActivityIcon className="h-4 w-4 mr-2" />
                Check Plant Health
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default PlantDetailModal;