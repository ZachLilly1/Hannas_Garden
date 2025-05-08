import { Express, Request, Response } from 'express';
import { storage } from '../storage';
import { isAuthenticated } from '../auth';
import { z } from 'zod';
import { insertProfileSettingsSchema, User } from '@shared/schema';
import * as logger from '../services/logger';

export function registerSocialRoutes(app: Express) {
  // Get user profile - public
  app.get('/api/profiles/:username', async (req: Request, res: Response) => {
    try {
      const { username } = req.params;
      
      // Get user profile with settings
      const profile = await storage.getPublicProfile(username);
      
      if (!profile) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Check if profile is public
      if (!profile.profileSettings.isProfilePublic && !req.isAuthenticated()) {
        return res.status(403).json({ message: "This profile is private" });
      }
      
      // Don't return sensitive data
      const { password, ...safeUserData } = profile.user;
      
      // Get follow counts
      const followCounts = await storage.getFollowCount(profile.user.id);
      
      // Check if current user is following this profile (if authenticated)
      let isFollowing = false;
      if (req.isAuthenticated() && req.user && req.user.id !== profile.user.id) {
        isFollowing = await storage.isFollowing(req.user.id, profile.user.id);
      }
      
      return res.status(200).json({
        user: safeUserData,
        isPublic: profile.profileSettings.isProfilePublic,
        isCollectionPublic: profile.profileSettings.isCollectionPublic,
        allowFollowers: profile.profileSettings.allowFollowers,
        followers: followCounts.followers,
        following: followCounts.following,
        isFollowing,
        isOwnProfile: req.isAuthenticated() && req.user.id === profile.user.id
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      return res.status(500).json({ message: "Failed to fetch profile" });
    }
  });
  
  // Get profile settings (own profile only)
  app.get('/api/profile/settings', isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Since isAuthenticated middleware is used, req.user is guaranteed to exist
      const userId = req.user!.id;
      
      // Get or create profile settings
      let settings = await storage.getProfileSettings(userId);
      
      if (!settings) {
        settings = await storage.createProfileSettings({
          userId,
          isProfilePublic: false,
          isCollectionPublic: false,
          showActivityInFeed: true,
          allowFollowers: true
        });
      }
      
      return res.status(200).json(settings);
    } catch (error) {
      logger.error('Error fetching profile settings:', error);
      return res.status(500).json({ message: "Failed to fetch profile settings" });
    }
  });
  
  // Update profile settings
  app.patch('/api/profile/settings', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      
      // Validate input
      const settingsSchema = insertProfileSettingsSchema.partial().omit({ userId: true });
      const result = settingsSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ message: "Invalid settings data", errors: result.error });
      }
      
      // Update settings
      const settings = await storage.updateProfileSettings(userId, {
        ...result.data,
        userId
      });
      
      return res.status(200).json(settings);
    } catch (error) {
      logger.error('Error updating profile settings:', error);
      return res.status(500).json({ message: "Failed to update profile settings" });
    }
  });
  
  // Get plants for a profile (public)
  app.get('/api/profiles/:username/plants', async (req: Request, res: Response) => {
    try {
      const { username } = req.params;
      
      // Get user profile
      const profile = await storage.getPublicProfile(username);
      
      if (!profile) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Check if plants are public or if current user is the owner
      const isOwner = req.isAuthenticated() && req.user && req.user.id === profile.user.id;
      
      if (!profile.profileSettings.isCollectionPublic && !isOwner) {
        return res.status(403).json({ message: "This plant collection is private" });
      }
      
      // Get plants
      const plants = await storage.getPlants(profile.user.id);
      
      return res.status(200).json(plants);
    } catch (error) {
      console.error('Error fetching profile plants:', error);
      return res.status(500).json({ message: "Failed to fetch profile plants" });
    }
  });
  
  // Follow a user
  app.post('/api/follow/:userId', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const followerId = req.user!.id;
      const followedId = parseInt(req.params.userId);
      
      if (isNaN(followedId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      // Check if user exists
      const userToFollow = await storage.getUser(followedId);
      
      if (!userToFollow) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Check if the user allows followers
      const profileSettings = await storage.getProfileSettings(followedId);
      
      if (profileSettings && !profileSettings.allowFollowers) {
        return res.status(403).json({ message: "This user does not allow followers" });
      }
      
      // Follow the user
      const follow = await storage.followUser(followerId, followedId);
      
      return res.status(201).json(follow);
    } catch (error) {
      logger.error('Error following user:', error);
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage === "Users cannot follow themselves" || 
          errorMessage === "Already following this user") {
        return res.status(400).json({ message: errorMessage });
      }
      
      return res.status(500).json({ message: "Failed to follow user" });
    }
  });
  
  // Unfollow a user
  app.delete('/api/follow/:userId', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const followerId = req.user!.id;
      const followedId = parseInt(req.params.userId);
      
      if (isNaN(followedId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      // Unfollow the user
      const result = await storage.unfollowUser(followerId, followedId);
      
      if (!result) {
        return res.status(404).json({ message: "You are not following this user" });
      }
      
      return res.status(200).json({ message: "Successfully unfollowed user" });
    } catch (error) {
      logger.error('Error unfollowing user:', error);
      return res.status(500).json({ message: "Failed to unfollow user" });
    }
  });
  
  // Get followers
  app.get('/api/profiles/:username/followers', async (req: Request, res: Response) => {
    try {
      const { username } = req.params;
      
      // Get user
      const user = await storage.getUserByUsername(username);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Get followers
      const followers = await storage.getFollowers(user.id);
      
      // Remove sensitive data
      const safeFollowers = followers.map(({ password, ...follower }) => follower);
      
      return res.status(200).json(safeFollowers);
    } catch (error) {
      logger.error('Error fetching followers:', error);
      return res.status(500).json({ message: "Failed to fetch followers" });
    }
  });
  
  // Get following
  app.get('/api/profiles/:username/following', async (req: Request, res: Response) => {
    try {
      const { username } = req.params;
      
      // Get user
      const user = await storage.getUserByUsername(username);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Get following
      const following = await storage.getFollowing(user.id);
      
      // Remove sensitive data
      const safeFollowing = following.map(({ password, ...follow }) => follow);
      
      return res.status(200).json(safeFollowing);
    } catch (error) {
      logger.error('Error fetching following:', error);
      return res.status(500).json({ message: "Failed to fetch following" });
    }
  });
  
  // Get activity feed - for authenticated user
  app.get('/api/feed', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      
      // Get activity feed from followed users
      const activities = await storage.getFollowingActivityFeed(userId, limit, offset);
      
      return res.status(200).json(activities);
    } catch (error) {
      logger.error('Error fetching activity feed:', error);
      return res.status(500).json({ message: "Failed to fetch activity feed" });
    }
  });
  
  // Get own activity
  app.get('/api/activities', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      
      // Get user's activity feed
      const activities = await storage.getUserActivityFeed(userId, limit, offset);
      
      return res.status(200).json(activities);
    } catch (error) {
      logger.error('Error fetching user activities:', error);
      return res.status(500).json({ message: "Failed to fetch user activities" });
    }
  });
  
  // Get suggested users - users not already followed
  app.get('/api/discover/suggested', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      
      // Get all users
      const users = await storage.getUsers();
      
      // Get current user's following list
      const following = await storage.getFollowing(userId);
      const followingIds = following.map(user => user.id);
      
      // Remove current user and already followed users
      const suggestedUsers = users.filter((user: User) => 
        user.id !== userId && !followingIds.includes(user.id)
      );
      
      // Get additional info for each user
      const suggestions = await Promise.all(
        suggestedUsers.slice(0, 6).map(async (user: User) => {
          const { password, ...safeUser } = user;
          const followCounts = await storage.getFollowCount(user.id);
          const plants = await storage.getPlants(user.id);
          
          return {
            user: safeUser,
            followers: followCounts.followers,
            following: followCounts.following,
            plantsCount: plants.length,
            isFollowing: false
          };
        })
      );
      
      return res.status(200).json(suggestions);
    } catch (error) {
      logger.error('Error fetching suggested users:', error);
      return res.status(500).json({ message: "Failed to fetch suggested users" });
    }
  });
  
  // Get trending users - users with most followers or plants
  app.get('/api/discover/trending', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      
      // Get all users
      const users = await storage.getUsers();
      
      // Get current user's following list to check if already following
      const following = await storage.getFollowing(userId);
      const followingIds = following.map(user => user.id);
      
      // Remove current user
      const otherUsers = users.filter((user: User) => user.id !== userId);
      
      // Get additional info for each user
      const usersWithFollowerCounts = await Promise.all(
        otherUsers.map(async (user: User) => {
          const { password, ...safeUser } = user;
          const followCounts = await storage.getFollowCount(user.id);
          const plants = await storage.getPlants(user.id);
          
          return {
            user: safeUser,
            followers: followCounts.followers,
            following: followCounts.following,
            plantsCount: plants.length,
            isFollowing: followingIds.includes(user.id)
          };
        })
      );
      
      // Sort by follower count (descending)
      const trending = usersWithFollowerCounts
        .sort((a: any, b: any) => b.followers - a.followers || b.plantsCount - a.plantsCount)
        .slice(0, 6);
      
      return res.status(200).json(trending);
    } catch (error) {
      logger.error('Error fetching trending users:', error);
      return res.status(500).json({ message: "Failed to fetch trending users" });
    }
  });
  
  // Search users
  app.get('/api/discover/search', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const query = req.query.q ? String(req.query.q).toLowerCase() : '';
      
      if (!query) {
        return res.status(200).json([]);
      }
      
      // Get all users
      const users = await storage.getUsers();
      
      // Get current user's following list
      const following = await storage.getFollowing(userId);
      const followingIds = following.map(user => user.id);
      
      // Filter users based on search query, exclude current user
      const matchingUsers = users.filter((user: User) => 
        user.id !== userId && 
        (user.username.toLowerCase().includes(query) || 
         (user.displayName && user.displayName.toLowerCase().includes(query)) ||
         (user.email && user.email.toLowerCase().includes(query)))
      );
      
      // Get additional info for each matching user
      const results = await Promise.all(
        matchingUsers.map(async (user: User) => {
          const { password, ...safeUser } = user;
          const followCounts = await storage.getFollowCount(user.id);
          const plants = await storage.getPlants(user.id);
          
          return {
            user: safeUser,
            followers: followCounts.followers,
            following: followCounts.following,
            plantsCount: plants.length,
            isFollowing: followingIds.includes(user.id)
          };
        })
      );
      
      return res.status(200).json(results);
    } catch (error) {
      logger.error('Error searching users:', error);
      return res.status(500).json({ message: "Failed to search users" });
    }
  });
}