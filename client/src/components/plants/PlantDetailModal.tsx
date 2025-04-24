import React, { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  WaterDropIcon, 
  SunIcon, 
  SeedlingIcon, 
  EditIcon, 
  CloseIcon, 
  HistoryIcon, 
  BellIcon, 
  CircleDotIcon, 
  CheckCircleIcon,
  CameraIcon,
  LeafIcon
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

  const handleCareLogSuccess = () => {
    setShowLogCareForm(false);
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
        <DialogContent className="mx-auto p-0 rounded-xl overflow-y-auto max-h-[90vh] w-[90vw] max-w-[450px]">
          <div className="h-64 relative">
            <img
              src={plant.image || getDefaultPlantImage(plant.type)}
              alt={plant.name}
              className="w-full h-full object-cover"
            />
            <button 
              className="absolute top-4 right-4 bg-black bg-opacity-20 text-white rounded-full p-2"
              onClick={onClose}
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="px-4 sm:px-6 py-5 w-full">
            <div className="flex justify-between items-center mb-2">
              <div className="flex flex-col">
                <h2 className="text-xl font-medium truncate max-w-[80%]">{plant.name}</h2>
                {plant.scientificName && (
                  <p className="text-sm text-muted-foreground italic">
                    {plant.scientificName}
                  </p>
                )}
              </div>
              <div className="flex space-x-3">
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
              <Badge variant="outline" className="px-2 py-1 bg-neutral-medium rounded-full text-xs mb-1">
                {plant.type.charAt(0).toUpperCase() + plant.type.slice(1)}
              </Badge>
              <Badge variant="outline" className="px-2 py-1 bg-neutral-medium rounded-full text-xs mb-1">
                {plant.sunlightLevel.charAt(0).toUpperCase() + plant.sunlightLevel.slice(1)} Light
              </Badge>
              {plant.guide && (
                <Badge variant="outline" className="px-2 py-1 bg-neutral-medium rounded-full text-xs mb-1">
                  Water every {plant.guide.idealWaterFrequency} days
                </Badge>
              )}
            </div>
            
            {/* Scientific name is now displayed in the header */}

            {/* Extract and display care tips if they exist in notes */}
            {plant.notes && plant.notes.includes("Care Tips:") ? (
              <div className="mb-6">
                <p className="text-sm font-medium mb-1">Care Tips:</p>
                <p className="text-sm text-neutral-dark opacity-90 break-words whitespace-pre-line hyphens-auto overflow-wrap-anywhere text-wrap-pretty break-word">
                  {plant.notes.split("Care Tips:")[1].trim()}
                </p>
              </div>
            ) : (
              <p className="text-sm text-neutral-dark opacity-90 mb-6 break-words whitespace-pre-line hyphens-auto overflow-wrap-anywhere text-wrap-pretty break-word">
                {plant.notes 
                  ? plant.notes
                  : (plant.guide?.description || `A beautiful ${plant.type} plant placed in ${plant.location}.`)}
              </p>
            )}

            {/* Tabs Interface */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
              <TabsList className="w-full flex bg-neutral-medium bg-opacity-20 p-0.5 rounded-md">
                <TabsTrigger 
                  value="care-schedule" 
                  className="flex-1 data-[state=active]:bg-white data-[state=active]:shadow-none"
                >
                  <WaterDropIcon className="h-4 w-4 mr-2" />
                  Care Schedule
                </TabsTrigger>
                <TabsTrigger 
                  value="history" 
                  className="flex-1 data-[state=active]:bg-white data-[state=active]:shadow-none"
                >
                  <HistoryIcon className="h-4 w-4 mr-2" />
                  History
                </TabsTrigger>
                <TabsTrigger 
                  value="reminders" 
                  className="flex-1 data-[state=active]:bg-white data-[state=active]:shadow-none"
                >
                  <BellIcon className="h-4 w-4 mr-2" />
                  Reminders
                </TabsTrigger>
              </TabsList>
              
              {/* Care Schedule Tab Content */}
              <TabsContent value="care-schedule" className="mt-4">
                <div className="space-y-4">
                  {/* Water Schedule */}
                  <div className="flex items-center p-3 bg-neutral-medium bg-opacity-30 rounded-lg">
                    <div className="p-2 bg-blue-100 rounded-full mr-3 flex-shrink-0">
                      <WaterDropIcon className="h-4 w-4 text-blue-500" />
                    </div>
                    <div className="min-w-0 flex-grow">
                      <p className="font-medium">Water</p>
                      <p className="text-xs text-neutral-dark opacity-70">Every {plant.waterFrequency} days</p>
                    </div>
                    <div className="text-right ml-2">
                      <p className="font-medium text-sm whitespace-nowrap">
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
                      <p className="text-xs text-neutral-dark opacity-70">
                        {waterRemainingDays !== null && waterRemainingDays >= 0 ? "remaining" : ""}
                      </p>
                    </div>
                  </div>

                  {/* Sunlight Schedule */}
                  <div className="flex items-center p-3 bg-neutral-medium bg-opacity-30 rounded-lg">
                    <div className="p-2 bg-yellow-100 rounded-full mr-3 flex-shrink-0">
                      <SunIcon className="h-4 w-4 text-yellow-500" />
                    </div>
                    <div className="min-w-0 flex-grow">
                      <p className="font-medium">Sunlight</p>
                      <p className="text-xs text-neutral-dark opacity-70">
                        {plant.sunlightLevel.charAt(0).toUpperCase() + plant.sunlightLevel.slice(1)}, 
                        {plant.sunlightLevel === "high" ? " direct" : " indirect"}
                      </p>
                    </div>
                    <div className={cn(
                      "text-xs font-medium text-right ml-2 whitespace-nowrap",
                      sunlightAdequate ? "text-status-success" : "text-status-warning"
                    )}>
                      {sunlightAdequate ? <CheckCircleIcon className="h-4 w-4 inline mr-1" /> : null}
                      {sunlightStatus}
                    </div>
                  </div>

                  {/* Fertilizer Schedule */}
                  <div className="flex items-center p-3 bg-neutral-medium bg-opacity-30 rounded-lg">
                    <div className="p-2 bg-green-100 rounded-full mr-3 flex-shrink-0">
                      <SeedlingIcon className="h-4 w-4 text-green-500" />
                    </div>
                    <div className="min-w-0 flex-grow">
                      <p className="font-medium">Fertilizer</p>
                      <p className="text-xs text-neutral-dark opacity-70">
                        {plant.fertilizerFrequency === 0 
                          ? "Not needed" 
                          : `Every ${plant.fertilizerFrequency} days`}
                      </p>
                    </div>
                    <div className="text-right ml-2">
                      {plant.fertilizerFrequency > 0 && (
                        <>
                          <p className="font-medium text-sm whitespace-nowrap">
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
                          <p className="text-xs text-neutral-dark opacity-70">
                            {fertilizerRemainingDays !== null && fertilizerRemainingDays >= 0 ? "remaining" : ""}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
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
                      className="text-xs whitespace-nowrap"
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
                      className="text-xs whitespace-nowrap"
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
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default PlantDetailModal;