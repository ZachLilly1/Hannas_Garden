import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InsertReminder, Reminder } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";

interface ReminderFormProps {
  isOpen: boolean;
  onClose: () => void;
  existingReminder?: Reminder;
  plantId?: number;
}

export function ReminderForm({
  isOpen,
  onClose,
  existingReminder,
  plantId
}: ReminderFormProps) {
  // Create a Zod schema for the form
  const formSchema = z.object({
    title: z.string().min(1, "Title is required"),
    message: z.string().optional(),
    dueDate: z.date({
      required_error: "Due date is required",
    }),
    careType: z.string().min(1, "Care type is required"),
    plantId: z.number().optional(),
    userId: z.number().int().default(1), // Default user ID is 1 for demo
    status: z.string().default("pending"),
    recurring: z.boolean().default(false),
    recurringInterval: z.number().nullable().default(null),
    notified: z.boolean().default(false)
  });
  
  type FormValues = z.infer<typeof formSchema>;
  
  // Default values for the form
  const defaultValues: Partial<FormValues> = {
    title: existingReminder?.title || "",
    message: existingReminder?.message || "",
    dueDate: existingReminder?.dueDate ? new Date(existingReminder.dueDate) : new Date(),
    careType: existingReminder?.careType || "water",
    plantId: plantId || existingReminder?.plantId,
    status: existingReminder?.status || "pending",
    recurring: existingReminder?.recurring || false,
    recurringInterval: existingReminder?.recurringInterval || null,
    notified: existingReminder?.notified || false
  };
  
  // Initialize the form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });
  
  // Handle form submission
  const onSubmit = async (data: FormValues) => {
    try {
      // Convert date to ISO string and prepare data
      const dueDate = data.dueDate.toISOString();
      const plantId = data.plantId || 0; // Default to 0 if not provided
      
      const reminderData: InsertReminder = {
        ...data,
        dueDate,
        plantId,
      };
      
      if (existingReminder) {
        // Update existing reminder
        await apiRequest("PATCH", `/api/reminders/${existingReminder.id}`, reminderData);
      } else {
        // Create new reminder
        await apiRequest("POST", "/api/reminders", reminderData);
      }
      
      // Invalidate reminders queries
      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reminders/upcoming"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reminders/overdue"] });
      if (plantId) {
        queryClient.invalidateQueries({ queryKey: [`/api/plants/${plantId}/reminders`] });
      }
      
      onClose();
    } catch (error) {
      console.error("Error saving reminder:", error);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {existingReminder ? "Edit Reminder" : "Add Reminder"}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Reminder title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message (optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Add details here..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Due Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className="pl-3 text-left font-normal"
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="careType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Care Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select care type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="water">Water</SelectItem>
                      <SelectItem value="fertilize">Fertilize</SelectItem>
                      <SelectItem value="prune">Prune</SelectItem>
                      <SelectItem value="repot">Repot</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">
                {existingReminder ? "Update" : "Create"} Reminder
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}