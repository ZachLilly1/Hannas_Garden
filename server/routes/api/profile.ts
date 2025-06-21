import { Router } from "express";
import { storage } from "../../storage";
import * as logger from "../../services/logger";
import { isAuthenticated, hashPassword, comparePasswords } from "../../auth";
import { handleError } from "../../utils/requestValidator";

export const profileRouter = Router();

// GET /api/profile - Get current authenticated user's profile
profileRouter.get("/", isAuthenticated, (req, res) => {
  // req.user is guaranteed by isAuthenticated, password is not selected
  res.json(req.user);
});

// PUT /api/profile - Update current user's profile
profileRouter.put("/", isAuthenticated, async (req, res) => {
  const userId = req.user!.id;
  const {
    displayName,
    email,
    bio,
    preferredUnits,
    timezone,
    notificationsEnabled,
    avatarUrl,
    photoBase64,
    prefersDarkMode,
    viewPreference,
    weatherLocation,
    onboardingCompleted
  } = req.body;

  const updateData: any = {};
  if (displayName !== undefined) updateData.displayName = displayName;
  if (email !== undefined) updateData.email = email;
  if (bio !== undefined) updateData.bio = bio;
  if (preferredUnits !== undefined) updateData.preferredUnits = preferredUnits;
  if (timezone !== undefined) updateData.timezone = timezone;
  if (notificationsEnabled !== undefined) updateData.notificationsEnabled = notificationsEnabled;
  if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;
  if (prefersDarkMode !== undefined) updateData.prefersDarkMode = prefersDarkMode;
  if (viewPreference !== undefined) updateData.viewPreference = viewPreference;
  if (weatherLocation !== undefined) updateData.weatherLocation = weatherLocation;
  if (onboardingCompleted !== undefined) updateData.onboardingCompleted = onboardingCompleted;

  if (photoBase64) {
    try {
      // In a real app, you'd upload this to S3/Cloud Storage and store the URL.
      // For now, storing the base64 data URL is acceptable for this project's scope.
      updateData.avatarUrl = photoBase64;
    } catch (error) {
      logger.error("Error processing profile image:", handleError(error));
      return res.status(500).json({ message: "Failed to save profile image" });
    }
  }

  try {
    const updatedUser = await storage.updateUserProfile(userId, updateData);
    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }
    const { password, ...userInfo } = updatedUser;
    res.json(userInfo);
  } catch (error: any) {
    logger.error("Error updating profile:", error);
    res.status(500).json({ message: "Failed to update profile", error: error.message });
  }
});

// Note: The password change route is in `server/auth.ts` as it's a core auth function.
// This keeps profile management separate from credential management.