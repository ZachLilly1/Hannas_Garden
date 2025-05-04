import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest, getQueryFn } from '@/lib/queryClient';
import { Loader2, Search, UserPlus, UserCheck } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User } from '@shared/schema';

// Type for user profile items
type UserProfileItem = {
  user: Omit<User, 'password'>;
  isFollowing: boolean;
  followers: number;
  following: number;
  plantsCount: number;
};

export default function DiscoverUsers() {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  
  // Fetch suggested users and trending users
  const { data: suggestedUsers, isLoading: suggestedLoading } = useQuery<UserProfileItem[]>({
    queryKey: ['/api/discover/suggested'],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });
  
  const { data: trendingUsers, isLoading: trendingLoading } = useQuery<UserProfileItem[]>({
    queryKey: ['/api/discover/trending'],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });
  
  // Search users query
  const { data: searchResults, isLoading: searchLoading } = useQuery<UserProfileItem[]>({
    queryKey: ['/api/discover/search', searchQuery],
    queryFn: async () => {
      const res = await fetch(`/api/discover/search?q=${encodeURIComponent(searchQuery)}`);
      if (!res.ok) {
        if (res.status === 401) return null;
        throw new Error(`Search failed: ${res.statusText}`);
      }
      return await res.json();
    },
    enabled: searchQuery.length > 0,
  });
  
  // Follow user mutation
  const followMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest('POST', `/api/follow/${userId}`);
      return await res.json();
    },
    onSuccess: (_, userId) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/discover/suggested'] });
      queryClient.invalidateQueries({ queryKey: ['/api/discover/trending'] });
      if (searchQuery) {
        queryClient.invalidateQueries({ queryKey: ['/api/discover/search'] });
      }
      
      toast({
        title: 'Success',
        description: 'You are now following this user',
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
    mutationFn: async (userId: number) => {
      const res = await apiRequest('DELETE', `/api/follow/${userId}`);
      return await res.json();
    },
    onSuccess: (_, userId) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/discover/suggested'] });
      queryClient.invalidateQueries({ queryKey: ['/api/discover/trending'] });
      if (searchQuery) {
        queryClient.invalidateQueries({ queryKey: ['/api/discover/search'] });
      }
      
      toast({
        title: 'Success',
        description: 'You are no longer following this user',
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
  
  // Handle follow/unfollow
  const handleFollowAction = (user: UserProfileItem) => {
    if (user.isFollowing) {
      unfollowMutation.mutate(user.user.id);
    } else {
      followMutation.mutate(user.user.id);
    }
  };
  
  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };
  
  // User card component
  const UserCard = ({ user }: { user: UserProfileItem }) => (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <Avatar 
            className="w-12 h-12 cursor-pointer"
            onClick={() => setLocation(`/profile/${user.user.username}`)}
          >
            <AvatarImage 
              src={user.user.avatarUrl || undefined} 
              alt={user.user.displayName || user.user.username} 
            />
            <AvatarFallback>
              {(user.user.displayName || user.user.username).charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <p 
              className="font-medium truncate cursor-pointer"
              onClick={() => setLocation(`/profile/${user.user.username}`)}
            >
              {user.user.displayName || user.user.username}
            </p>
            <p className="text-sm text-muted-foreground truncate">
              @{user.user.username}
            </p>
            <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
              <span>{user.plantsCount} plants</span>
              <span>{user.followers} followers</span>
            </div>
          </div>
          
          <Button
            variant={user.isFollowing ? "secondary" : "default"}
            size="sm"
            onClick={() => handleFollowAction(user)}
            disabled={followMutation.isPending || unfollowMutation.isPending}
          >
            {followMutation.isPending || unfollowMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : user.isFollowing ? (
              <UserCheck className="w-4 h-4" />
            ) : (
              <UserPlus className="w-4 h-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
  
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Discover Users</h1>
      
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search users..."
            className="pl-10"
            value={searchQuery}
            onChange={handleSearchChange}
          />
        </div>
      </div>
      
      {searchQuery ? (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Search Results</h2>
          
          {searchLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : searchResults && searchResults.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {searchResults.map(user => (
                <UserCard key={user.user.id} user={user} />
              ))}
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>No Results</CardTitle>
                <CardDescription>
                  No users found matching "{searchQuery}"
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </div>
      ) : (
        <>
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Suggested for You</h2>
            
            {suggestedLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : suggestedUsers && suggestedUsers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {suggestedUsers.map(user => (
                  <UserCard key={user.user.id} user={user} />
                ))}
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>No Suggestions</CardTitle>
                  <CardDescription>
                    We don't have any user suggestions for you at this time.
                  </CardDescription>
                </CardHeader>
              </Card>
            )}
          </div>
          
          <div>
            <h2 className="text-xl font-semibold mb-4">Trending Plant Parents</h2>
            
            {trendingLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : trendingUsers && trendingUsers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {trendingUsers.map(user => (
                  <UserCard key={user.user.id} user={user} />
                ))}
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>No Trending Users</CardTitle>
                  <CardDescription>
                    Check back later for trending plant parents.
                  </CardDescription>
                </CardHeader>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
}