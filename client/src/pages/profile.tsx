import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { UserIcon, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { type PlantWithCare } from "@shared/schema";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

// Common timezones for selection
const TIMEZONES = [
  { value: "UTC", label: "UTC (Coordinated Universal Time)" },
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "Europe/London", label: "GMT (Greenwich Mean Time)" },
  { value: "Europe/Paris", label: "CET (Central European Time)" },
  { value: "Asia/Tokyo", label: "JST (Japan Standard Time)" },
  { value: "Australia/Sydney", label: "AEST (Australian Eastern Standard Time)" },
];
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const formSchema = z.object({
  displayName: z.string().optional(),
  email: z.string().email("Please enter a valid email address"),
  bio: z.string().max(250, "Bio should be less than 250 characters").optional(),
  preferredUnits: z.enum(["metric", "imperial"]),
  timezone: z.string(),
  notificationsEnabled: z.boolean(),
  avatarUrl: z.union([z.string().url("Please enter a valid URL"), z.string().length(0)]).optional(),
  photoBase64: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function Profile() {
  const { user, logout, updateProfile } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  
  // Get plants count
  const { data: plants, isLoading: isLoadingPlants } = useQuery<PlantWithCare[]>({
    queryKey: ['/api/plants'],
  });

  const plantsCount = plants?.length || 0;

  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      displayName: user?.displayName || "",
      email: user?.email || "",
      bio: user?.bio || "",
      preferredUnits: (user?.preferredUnits as "metric" | "imperial") || "metric",
      timezone: user?.timezone || "UTC",
      notificationsEnabled: user?.notificationsEnabled || true,
      avatarUrl: user?.avatarUrl || "",
      photoBase64: undefined,
    },
  });
  
  // Handle file upload for profile photo
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Check if file is an image
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }
    
    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Image size should be less than 2MB",
        variant: "destructive",
      });
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64String = e.target?.result as string;
      setPreviewImage(base64String);
      form.setValue("photoBase64", base64String);
    };
    reader.readAsDataURL(file);
  };

  async function onSubmit(data: FormValues) {
    setIsSubmitting(true);
    try {
      await updateProfile(data);
      setIsEditProfileOpen(false);
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleLogout = async () => {
    try {
      // The logout function in authContext now properly handles CSRF token
      await logout();
      // The logout function handles the redirect, so no need to do anything else
    } catch (error) {
      toast({
        title: "Logout failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="p-4 space-y-6">
      {/* User Profile */}
      <Card className="overflow-visible">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">My Profile</CardTitle>
        </CardHeader>
        <CardContent className="overflow-visible">
          <div className="flex items-center mb-4">
            {user?.avatarUrl ? (
              <div className="h-16 w-16 rounded-full overflow-hidden mr-4 flex-shrink-0">
                <img 
                  src={user.avatarUrl} 
                  alt={user.displayName || user.username} 
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = ""; // Clear the broken image
                    const parent = e.currentTarget.parentElement;
                    if (parent) {
                      parent.innerHTML = `<div class="h-full w-full flex items-center justify-center bg-primary/10 text-primary"><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg></div>`;
                    }
                  }}
                />
              </div>
            ) : (
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mr-4 flex-shrink-0">
                <UserIcon className="h-8 w-8" />
              </div>
            )}
            <div className="min-w-0">
              <h3 className="font-medium truncate">{user?.displayName || user?.username}</h3>
              <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
              {user?.bio && (
                <p className="text-sm mt-1 line-clamp-2">{user.bio}</p>
              )}
            </div>
          </div>
          
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm">Plants in your garden</span>
            {isLoadingPlants ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Badge variant="outline" className="bg-primary/10 text-primary">
                {plantsCount}
              </Badge>
            )}
          </div>
          
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm">Care logs recorded</span>
            {isLoadingPlants ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Badge variant="outline" className="bg-primary/10 text-primary">
                {plantsCount > 0 ? plantsCount * 2 : 0}
              </Badge>
            )}
          </div>
          
          <div className="mt-4 space-y-2">
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => setIsEditProfileOpen(true)}
            >
              Edit Profile
            </Button>
            <Button 
              variant="outline" 
              className="w-full text-red-500 hover:text-red-700 hover:bg-red-50"
              onClick={handleLogout}
            >
              Log Out
            </Button>
          </div>
          
          {/* Edit Profile Dialog */}
          <Dialog 
            open={isEditProfileOpen} 
            onOpenChange={setIsEditProfileOpen}
          >
            <DialogContent className="sm:max-w-[425px] w-[95vw] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Profile</DialogTitle>
                <DialogDescription>
                  Update your profile information and preferences.
                </DialogDescription>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                  <FormField
                    control={form.control}
                    name="displayName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Display Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your display name" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormDescription>
                          This is how we'll address you in the app.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="name@example.com" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormDescription>
                          Email address for notifications and account recovery.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bio</FormLabel>
                        <FormControl>
                          <textarea 
                            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            placeholder="Tell us a bit about yourself or your garden..." 
                            {...field} 
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormDescription>
                          A short bio to share with the community (max 250 characters).
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Profile Photo Upload */}
                  <div className="space-y-3">
                    <FormLabel className="text-base">Profile Photo</FormLabel>
                    <div className="flex items-center gap-4">
                      <div className="h-20 w-20 rounded-full overflow-hidden bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                        {previewImage ? (
                          <img 
                            src={previewImage} 
                            alt="Profile preview" 
                            className="h-full w-full object-cover"
                          />
                        ) : user?.avatarUrl ? (
                          <img 
                            src={user.avatarUrl} 
                            alt={user.displayName || user.username} 
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <UserIcon className="h-10 w-10 text-neutral-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full mb-2"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          Upload Photo
                        </Button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleFileChange}
                        />
                        <p className="text-xs text-muted-foreground">
                          JPEG or PNG, max 2MB
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="avatarUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Profile Picture URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://example.com/avatar.jpg" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormDescription>
                          Alternatively, enter a URL for your profile picture.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="preferredUnits"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Measurement Units</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select measurement units" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="metric">Metric</SelectItem>
                            <SelectItem value="imperial">Imperial</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Choose your preferred measurement system.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="timezone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Timezone</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select your timezone" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {TIMEZONES.map(timezone => (
                              <SelectItem key={timezone.value} value={timezone.value}>
                                {timezone.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Used for scheduling reminders and care logs.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="notificationsEnabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Care Reminders
                          </FormLabel>
                          <FormDescription>
                            Receive notifications for plant care.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <DialogFooter>
                    <Button 
                      type="submit"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Changes"
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
      
      {/* App Settings */}
      <Card className="overflow-visible">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">App Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 overflow-visible">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Care Reminders</p>
              <p className="text-sm text-muted-foreground">Get notified when your plants need care</p>
            </div>
            <Switch checked={user?.notificationsEnabled === true} />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Measurement Units</p>
              <p className="text-sm text-muted-foreground">Choose between metric or imperial</p>
            </div>
            <div className="text-sm font-medium capitalize">{user?.preferredUnits || "Metric"}</div>
          </div>
        </CardContent>
      </Card>
      
      {/* About */}
      <Card className="overflow-visible">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">About Hanna's Garden</CardTitle>
        </CardHeader>
        <CardContent className="overflow-visible">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <LeafIcon className="h-6 w-6" />
            </div>
          </div>
          
          <p className="text-center text-sm mb-2">Hanna's Garden v1.0.0</p>
          <p className="text-center text-xs text-muted-foreground mb-4">
            Your personal plant care companion
          </p>
          
          <div className="flex justify-center space-x-2">
            <Button variant="outline" size="sm">Privacy Policy</Button>
            <Button variant="outline" size="sm">Terms of Service</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
