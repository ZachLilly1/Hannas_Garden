import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { getQueryFn } from '@/lib/queryClient';
import { Loader2, Leaf, Heart, Share2, UserPlus, Image, CalendarClock } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';

// Activity types from schema
const ACTIVITY_TYPES = ['plant_added', 'care_log_added', 'plant_shared', 'care_log_shared', 'profile_updated', 'follow_user'] as const;
type ActivityType = typeof ACTIVITY_TYPES[number];

// Activity feed item type
type ActivityFeedItem = {
  id: number;
  userId: number;
  activityType: ActivityType;
  entityId: number | null;
  timestamp: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  details: {
    plantName?: string;
    plantImage?: string;
    careType?: string;
    otherUsername?: string;
  };
};

// Activity icon mapping
const ActivityIcon = ({ type }: { type: ActivityType }) => {
  switch (type) {
    case 'plant_added':
      return <Leaf className="w-4 h-4 text-green-500" />;
    case 'care_log_added':
      return <CalendarClock className="w-4 h-4 text-blue-500" />;
    case 'plant_shared':
    case 'care_log_shared':
      return <Share2 className="w-4 h-4 text-purple-500" />;
    case 'profile_updated':
      return <Image className="w-4 h-4 text-amber-500" />;
    case 'follow_user':
      return <UserPlus className="w-4 h-4 text-pink-500" />;
    default:
      return <Heart className="w-4 h-4 text-red-500" />;
  }
};

// Activity message formatter
const getActivityMessage = (activity: ActivityFeedItem) => {
  const name = activity.displayName || activity.username;
  
  switch (activity.activityType) {
    case 'plant_added':
      return (
        <span>
          <span className="font-medium">{name}</span> added a new plant: 
          <span className="font-medium"> {activity.details.plantName}</span>
        </span>
      );
    case 'care_log_added':
      return (
        <span>
          <span className="font-medium">{name}</span> logged 
          <span className="font-medium"> {activity.details.careType}</span> care for 
          <span className="font-medium"> {activity.details.plantName}</span>
        </span>
      );
    case 'plant_shared':
      return (
        <span>
          <span className="font-medium">{name}</span> shared their plant 
          <span className="font-medium"> {activity.details.plantName}</span>
        </span>
      );
    case 'care_log_shared':
      return (
        <span>
          <span className="font-medium">{name}</span> shared a care log for 
          <span className="font-medium"> {activity.details.plantName}</span>
        </span>
      );
    case 'profile_updated':
      return (
        <span>
          <span className="font-medium">{name}</span> updated their profile
        </span>
      );
    case 'follow_user':
      return (
        <span>
          <span className="font-medium">{name}</span> started following 
          <span className="font-medium"> {activity.details.otherUsername}</span>
        </span>
      );
    default:
      return <span>Unknown activity</span>;
  }
};

export default function ActivityFeed() {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [page, setPage] = useState(0);
  const limit = 10;
  
  // Define activity feed type
  type ActivityFeedResponse = ActivityFeedItem[];
  
  // Fetch activity feed
  const { 
    data: activityData,
    isLoading,
    error
  } = useQuery<ActivityFeedResponse>({
    queryKey: ['/api/feed', { limit, offset: page * limit }],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });
  
  // Function to load more items
  const loadMoreItems = () => {
    setPage(prevPage => prevPage + 1);
  };
  
  // Handle errors
  if (error) {
    toast({
      title: 'Error',
      description: 'Failed to load activity feed',
      variant: 'destructive',
    });
  }
  
  // No data yet
  if (!activityData && !isLoading) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Feed Empty</CardTitle>
            <CardDescription>
              Your feed is empty. Follow other users to see their activities!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation('/discover')}>Discover Users</Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Activity Feed</h1>
      
      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : activityData && activityData.length > 0 ? (
        <div className="space-y-4">
          {activityData.map((activity: ActivityFeedItem) => (
            <Card key={activity.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar 
                    className="w-10 h-10 mt-1 cursor-pointer"
                    onClick={() => setLocation(`/profile/${activity.username}`)}
                  >
                    <AvatarImage 
                      src={activity.avatarUrl || undefined} 
                      alt={activity.displayName || activity.username} 
                    />
                    <AvatarFallback>
                      {(activity.displayName || activity.username).charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <ActivityIcon type={activity.activityType} />
                      {getActivityMessage(activity)}
                    </div>
                    
                    {activity.details.plantImage && ['plant_added', 'care_log_added'].includes(activity.activityType) && (
                      <div className="mt-2 rounded-md overflow-hidden">
                        <img 
                          src={activity.details.plantImage} 
                          alt={activity.details.plantName} 
                          className="w-full max-h-48 object-cover"
                        />
                      </div>
                    )}
                    
                    <div className="mt-2 text-xs text-muted-foreground">
                      {format(new Date(activity.timestamp), 'MMM d, yyyy • h:mm a')}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          <div className="flex justify-center mt-4">
            <Button
              variant="outline"
              onClick={loadMoreItems}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading more...
                </>
              ) : (
                'Load More'
              )}
            </Button>
          </div>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Feed Empty</CardTitle>
            <CardDescription>
              Your feed is empty. Follow other users to see their activities!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation('/discover')}>Discover Users</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}