import React from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Reminder } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";
import { BellIcon, CheckCircleIcon, XCircleIcon } from "lucide-react";

interface ReminderListProps {
  type: "upcoming" | "overdue" | "all" | "plant";
  plantId?: number;
  days?: number;
  onAddReminder?: () => void;
}

export function ReminderList({ type, plantId, days = 7, onAddReminder }: ReminderListProps) {
  const getQueryKey = () => {
    switch (type) {
      case "upcoming":
        return [`/api/reminders/upcoming/${days}`];
      case "overdue":
        return ["/api/reminders/overdue"];
      case "plant":
        return [`/api/plants/${plantId}/reminders`];
      case "all":
      default:
        return ["/api/reminders"];
    }
  };

  const { data: reminders, isLoading, error } = useQuery<Reminder[]>({
    queryKey: getQueryKey(),
  });

  const handleComplete = async (id: number) => {
    try {
      await fetch(`/api/reminders/${id}/complete`, {
        method: "POST",
      });
      // Invalidate reminders queries
      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reminders/upcoming"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reminders/overdue"] });
      if (plantId) {
        queryClient.invalidateQueries({ queryKey: [`/api/plants/${plantId}/reminders`] });
      }
    } catch (error) {
      console.error("Error completing reminder:", error);
    }
  };

  const handleDismiss = async (id: number) => {
    try {
      await fetch(`/api/reminders/${id}/dismiss`, {
        method: "POST",
      });
      // Invalidate reminders queries
      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reminders/upcoming"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reminders/overdue"] });
      if (plantId) {
        queryClient.invalidateQueries({ queryKey: [`/api/plants/${plantId}/reminders`] });
      }
    } catch (error) {
      console.error("Error dismissing reminder:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Completed</Badge>;
      case "dismissed":
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Dismissed</Badge>;
      case "pending":
      default:
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
    }
  };

  const getTitle = () => {
    switch (type) {
      case "upcoming":
        return `Upcoming Reminders (Next ${days} days)`;
      case "overdue":
        return "Overdue Reminders";
      case "plant":
        return "Plant Reminders";
      case "all":
      default:
        return "All Reminders";
    }
  };

  if (isLoading) {
    return <div className="p-4 text-center">Loading reminders...</div>;
  }

  if (error) {
    return <div className="p-4 text-center text-red-500">Error loading reminders</div>;
  }

  if (!reminders || reminders.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <BellIcon className="mr-2 h-5 w-5" />
            {getTitle()}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center py-6 text-gray-500">No reminders found</p>
        </CardContent>
        {onAddReminder && (
          <CardFooter className="flex justify-center">
            <Button onClick={onAddReminder} variant="outline">Add Reminder</Button>
          </CardFooter>
        )}
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center">
          <BellIcon className="mr-2 h-5 w-5" />
          {getTitle()}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {reminders.map((reminder) => (
            <div 
              key={reminder.id} 
              className={`p-3 border rounded-lg ${
                reminder.status === "pending" 
                  ? "border-yellow-200 bg-yellow-50" 
                  : reminder.status === "completed"
                    ? "border-green-200 bg-green-50"
                    : "border-gray-200 bg-gray-50"
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium">{reminder.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{reminder.message}</p>
                  <div className="flex items-center mt-2 text-xs text-gray-500">
                    <span className="mr-3">Due: {formatDate(reminder.dueDate)}</span>
                    {getStatusBadge(reminder.status)}
                  </div>
                </div>
                
                {reminder.status === "pending" && (
                  <div className="flex space-x-2">
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-8 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                      onClick={() => handleComplete(reminder.id)}
                    >
                      <CheckCircleIcon className="h-4 w-4 mr-1" />
                      Complete
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-8 px-2 text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                      onClick={() => handleDismiss(reminder.id)}
                    >
                      <XCircleIcon className="h-4 w-4 mr-1" />
                      Dismiss
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
      {onAddReminder && (
        <CardFooter className="flex justify-center">
          <Button onClick={onAddReminder} variant="outline">Add Reminder</Button>
        </CardFooter>
      )}
    </Card>
  );
}