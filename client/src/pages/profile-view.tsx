import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useLocation, useParams } from 'wouter';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest, getQueryFn } from '@/lib/queryClient';
import { Loader2, UserCheck, UserPlus, Settings, Share } from 'lucide-react';
import ProfilePlantGrid from '@/components/plants/ProfilePlantGrid';
import { User, PlantWithCare } from '@shared/schema';

// Type for profile response
type ProfileResponse = {
  user: Omit<User, 'password'>;
  isPublic: boolean;
  isCollectionPublic: boolean;
  allowFollowers: boolean;
  followers: number;
  following: number;
  isFollowing: boolean;
  isOwnProfile: boolean;
};

export default function ProfileView() {
  const { username } = useParams<{ username: string }>();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('plants');

  // Fetch profile data
  const { data: profile, isLoading: profileLoading, error: profileError } = useQuery<ProfileResponse>({
    queryKey: [`/api/profiles/${username}`],
    queryFn: getQueryFn({ on404: "returnEmpty" }),
    enabled: !!username,
  });

  // Fetch user's plants if they are public or it's the user's own profile
  const { data: plants, isLoading: plantsLoading } = useQuery<PlantWithCare[]>({
    queryKey: [`/api/profiles/${username}/plants`],
    queryFn: getQueryFn({ on404: "returnEmpty" }),
    enabled: !!profile && (profile.isCollectionPublic || profile.isOwnProfile),
  });

  // Follow user mutation
  const followMutation = useMutation({
    mutationFn: async () => {
      if (!profile) return null;
      const res = await apiRequest('POST', `/api/follow/${profile.user.id}`);
      return await res.json();
    },
    onSuccess: () => {
      // Invalidate profile data to refresh follow status
      queryClient.invalidateQueries({ queryKey: [`/api/profiles/${username}`] });
      toast({
        title: 'Success',
        description: `You are now following ${profile?.user.displayName || username}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to follow user: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Unfollow user mutation
  const unfollowMutation = useMutation({
    mutationFn: async () => {
      if (!profile) return null;
      const res = await apiRequest('DELETE', `/api/follow/${profile.user.id}`);
      return await res.json();
    },
    onSuccess: () => {
      // Invalidate profile data to refresh follow status
      queryClient.invalidateQueries({ queryKey: [`/api/profiles/${username}`] });
      toast({
        title: 'Success',
        description: `You are no longer following ${profile?.user.displayName || username}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to unfollow user: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Fetch followers
  const { data: followers, isLoading: followersLoading } = useQuery<User[]>({
    queryKey: [`/api/profiles/${username}/followers`],
    queryFn: getQueryFn({ on404: "returnEmpty" }),
    enabled: activeTab === 'followers' && !!profile,
  });

  // Fetch following
  const { data: following, isLoading: followingLoading } = useQuery<User[]>({
    queryKey: [`/api/profiles/${username}/following`],
    queryFn: getQueryFn({ on404: "returnEmpty" }),
    enabled: activeTab === 'following' && !!profile,
  });

  // Handle errors
  useEffect(() => {
    if (profileError) {
      toast({
        title: 'Error',
        description: 'Failed to load profile',
        variant: 'destructive',
      });
    }
  }, [profileError, toast]);

  // Loading state
  if (profileLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

  // Profile not found or private
  if (!profile) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Profile Not Found</CardTitle>
            <CardDescription>
              This profile does not exist or is private.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation('/')}>Return Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Handle follow/unfollow
  const handleFollowAction = () => {
    if (profile.isFollowing) {
      unfollowMutation.mutate();
    } else {
      followMutation.mutate();
    }
  };

  return (
    <div className="container mx-auto py-6">
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <Avatar className="w-24 h-24 border">
              <AvatarImage src={profile.user.avatarUrl || undefined} alt={profile.user.displayName || profile.user.username} />
              <AvatarFallback className="text-2xl">
                {(profile.user.displayName || profile.user.username).charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <h1 className="text-2xl font-bold">
                {profile.user.displayName || profile.user.username}
              </h1>
              <p className="text-muted-foreground">@{profile.user.username}</p>
              
              {profile.user.bio && (
                <p className="mt-2 text-sm">{profile.user.bio}</p>
              )}
              
              <div className="flex gap-4 mt-3 text-sm">
                <span>
                  <strong>{profile.followers}</strong> Followers
                </span>
                <span>
                  <strong>{profile.following}</strong> Following
                </span>
              </div>
            </div>
            
            <div className="flex gap-2 self-start mt-2 md:mt-0">
              {profile.isOwnProfile ? (
                <Button variant="outline" onClick={() => setLocation('/profile')}>
                  <Settings className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              ) : profile.allowFollowers ? (
                <Button 
                  variant={profile.isFollowing ? "secondary" : "default"}
                  onClick={handleFollowAction}
                  disabled={followMutation.isPending || unfollowMutation.isPending}
                >
                  {followMutation.isPending || unfollowMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : profile.isFollowing ? (
                    <UserCheck className="w-4 h-4 mr-2" />
                  ) : (
                    <UserPlus className="w-4 h-4 mr-2" />
                  )}
                  {profile.isFollowing ? 'Following' : 'Follow'}
                </Button>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="plants">Plants</TabsTrigger>
          <TabsTrigger value="followers">Followers</TabsTrigger>
          <TabsTrigger value="following">Following</TabsTrigger>
        </TabsList>
        
        <TabsContent value="plants">
          {!profile.isCollectionPublic && !profile.isOwnProfile ? (
            <Card>
              <CardHeader>
                <CardTitle>Private Collection</CardTitle>
                <CardDescription>
                  This user's plant collection is private.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : plantsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : plants && plants.length > 0 ? (
            <ProfilePlantGrid plants={plants} showAddButton={false} />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>No Plants</CardTitle>
                <CardDescription>
                  {profile.isOwnProfile 
                    ? "You haven't added any plants yet."
                    : "This user hasn't added any plants yet."}
                </CardDescription>
              </CardHeader>
              {profile.isOwnProfile && (
                <CardContent>
                  <Button onClick={() => setLocation('/plants')}>Add Your First Plant</Button>
                </CardContent>
              )}
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="followers">
          {followersLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : followers && followers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {followers.map((follower: any) => (
                <Card key={follower.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={follower.avatarUrl || undefined} alt={follower.displayName || follower.username} />
                        <AvatarFallback>
                          {(follower.displayName || follower.username).charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{follower.displayName || follower.username}</p>
                        <p className="text-sm text-muted-foreground truncate">@{follower.username}</p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setLocation(`/profile/${follower.username}`)}
                      >
                        View
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>No Followers</CardTitle>
                <CardDescription>
                  {profile.isOwnProfile 
                    ? "You don't have any followers yet."
                    : "This user doesn't have any followers yet."}
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="following">
          {followingLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : following && following.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {following.map((follow: any) => (
                <Card key={follow.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={follow.avatarUrl || undefined} alt={follow.displayName || follow.username} />
                        <AvatarFallback>
                          {(follow.displayName || follow.username).charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{follow.displayName || follow.username}</p>
                        <p className="text-sm text-muted-foreground truncate">@{follow.username}</p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setLocation(`/profile/${follow.username}`)}
                      >
                        View
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Not Following Anyone</CardTitle>
                <CardDescription>
                  {profile.isOwnProfile 
                    ? "You're not following anyone yet."
                    : "This user isn't following anyone yet."}
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}