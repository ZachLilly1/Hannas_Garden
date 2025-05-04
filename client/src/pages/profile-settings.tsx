import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest, getQueryFn } from '@/lib/queryClient';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { User } from '@shared/schema';

// Type for profile settings response
type ProfileSettings = {
  id: number;
  userId: number;
  isProfilePublic: boolean;
  isCollectionPublic: boolean;
  allowFollowers: boolean;
  showActivityInFeed: boolean;
};

export default function ProfileSettings() {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  // Get user data
  const { data: user, isLoading: userLoading } = useQuery<User>({
    queryKey: ['/api/auth/user'],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });
  
  // Get profile settings
  const { 
    data: settings, 
    isLoading: settingsLoading,
    error: settingsError
  } = useQuery<ProfileSettings>({
    queryKey: ['/api/profile/settings'],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user,
  });
  
  // Form state
  const [formState, setFormState] = useState({
    displayName: '',
    email: '',
    bio: '',
    avatarUrl: '',
    isProfilePublic: false,
    isCollectionPublic: false,
    allowFollowers: true,
    showActivityInFeed: true,
  });
  
  // Update form state when settings are loaded
  useEffect(() => {
    if (user) {
      setFormState(prev => ({
        ...prev,
        displayName: user.displayName || '',
        email: user.email || '',
        bio: user.bio || '',
        avatarUrl: user.avatarUrl || '',
      }));
    }
    
    if (settings) {
      setFormState(prev => ({
        ...prev,
        isProfilePublic: settings.isProfilePublic,
        isCollectionPublic: settings.isCollectionPublic,
        allowFollowers: settings.allowFollowers,
        showActivityInFeed: settings.showActivityInFeed,
      }));
    }
  }, [user, settings]);
  
  // Handle form changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle switch changes
  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormState(prev => ({ ...prev, [name]: checked }));
  };
  
  // Update profile mutation
  const profileMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('PUT', '/api/auth/profile', data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      toast({
        title: 'Profile Updated',
        description: 'Your profile information has been updated.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to update profile: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
  
  // Update settings mutation
  const settingsMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('PATCH', '/api/profile/settings', data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/profile/settings'] });
      toast({
        title: 'Settings Updated',
        description: 'Your profile settings have been updated.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to update settings: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Update profile info
    const profileData = {
      displayName: formState.displayName,
      email: formState.email,
      bio: formState.bio,
    };
    
    // Update settings
    const settingsData = {
      isProfilePublic: formState.isProfilePublic,
      isCollectionPublic: formState.isCollectionPublic,
      allowFollowers: formState.allowFollowers,
      showActivityInFeed: formState.showActivityInFeed,
    };
    
    // Run both mutations
    profileMutation.mutate(profileData);
    settingsMutation.mutate(settingsData);
  };
  
  // Loading state
  if (userLoading || settingsLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading settings...</p>
      </div>
    );
  }
  
  // Error state
  if (settingsError || !user) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load settings. Please try again later.
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button onClick={() => setLocation('/')}>Return Home</Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          className="mr-4 p-2"
          onClick={() => setLocation(`/profile/${user.username}`)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">Profile Settings</h1>
      </div>
      
      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your personal information visible to other users
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-4">
                <Avatar className="w-16 h-16 border">
                  <AvatarImage 
                    src={formState.avatarUrl || undefined} 
                    alt={formState.displayName || user.username} 
                  />
                  <AvatarFallback className="text-xl">
                    {(formState.displayName || user.username).charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Profile photo coming in a future update
                  </p>
                </div>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  name="displayName"
                  value={formState.displayName}
                  onChange={handleChange}
                  placeholder="Your display name"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formState.email}
                  onChange={handleChange}
                  placeholder="Your email address"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  name="bio"
                  value={formState.bio}
                  onChange={handleChange}
                  placeholder="Tell us a bit about yourself..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Privacy Settings</CardTitle>
              <CardDescription>
                Control who can see your profile and plants
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="isProfilePublic">Public Profile</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow anyone to view your profile
                  </p>
                </div>
                <Switch
                  id="isProfilePublic"
                  checked={formState.isProfilePublic}
                  onCheckedChange={(checked) => 
                    handleSwitchChange('isProfilePublic', checked)
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="isCollectionPublic">Public Plant Collection</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow anyone to view your plants
                  </p>
                </div>
                <Switch
                  id="isCollectionPublic"
                  checked={formState.isCollectionPublic}
                  onCheckedChange={(checked) => 
                    handleSwitchChange('isCollectionPublic', checked)
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="allowFollowers">Allow Followers</Label>
                  <p className="text-sm text-muted-foreground">
                    Let other users follow you
                  </p>
                </div>
                <Switch
                  id="allowFollowers"
                  checked={formState.allowFollowers}
                  onCheckedChange={(checked) => 
                    handleSwitchChange('allowFollowers', checked)
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="showActivityInFeed">Show Activity</Label>
                  <p className="text-sm text-muted-foreground">
                    Share your activity in followers' feeds
                  </p>
                </div>
                <Switch
                  id="showActivityInFeed"
                  checked={formState.showActivityInFeed}
                  onCheckedChange={(checked) => 
                    handleSwitchChange('showActivityInFeed', checked)
                  }
                />
              </div>
            </CardContent>
          </Card>
        </div>
        
        <CardFooter className="flex justify-between px-0">
          <Button 
            variant="outline" 
            onClick={() => setLocation(`/profile/${user.username}`)}
          >
            Cancel
          </Button>
          <Button 
            type="submit"
            disabled={profileMutation.isPending || settingsMutation.isPending}
          >
            {(profileMutation.isPending || settingsMutation.isPending) && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Save Changes
          </Button>
        </CardFooter>
      </form>
    </div>
  );
}