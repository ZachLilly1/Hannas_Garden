import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { loginSchema, User as SelectUser } from "@shared/schema";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";

// Define SessionStore type
type SessionStore = session.Store;
type MemoryStore = session.MemoryStore;

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

// PostgreSQL session store
const PgSession = connectPgSimple(session);
let pgSessionStore: session.Store;

try {
  // Create PostgreSQL session store with increased max listeners
  pgSessionStore = new PgSession({
    pool,
    tableName: 'user_sessions', // Custom session table name
    createTableIfMissing: true
  });
  
  // Fix for MaxListenersExceededWarning
  // Increase max listeners for the session store
  if (pgSessionStore.setMaxListeners) {
    pgSessionStore.setMaxListeners(100); // Increase substantially to prevent warnings
  }
  
  console.log('PostgreSQL session store initialized successfully');
} catch (error) {
  console.error('Error initializing PostgreSQL session store:', error);
  // Fallback to memory store if PostgreSQL store fails
  const MemoryStore = session.MemoryStore;
  pgSessionStore = new MemoryStore();
  console.log('Fallback to memory session store');
}

// Hash password for secure storage
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

// Compare user input with stored hashed password
export async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// Check if a user is authenticated
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Authentication required" });
}

// Setup authentication for the application
export function setupAuth(app: Express) {
  if (!process.env.SESSION_SECRET) {
    // Use a secure random value if no secret is provided
    process.env.SESSION_SECRET = randomBytes(32).toString('hex');
    console.warn("Warning: SESSION_SECRET not set, using generated random value instead");
  }

  // Session configuration
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: pgSessionStore,
    cookie: {
      // In production, allow secure cookies in all environments since we 
      // can't predict the deployment environment
      secure: false,
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
      sameSite: "lax",
      path: "/"
    }
  };

  // Setup middleware
  app.set("trust proxy", 1);
  
  // Add error handling for session middleware
  app.use((req, res, next) => {
    session(sessionSettings)(req, res, (err) => {
      if (err) {
        console.error('Session middleware error:', err);
        // Continue without a session in case of error
        next();
      } else {
        next();
      }
    });
  });
  
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure Passport with Local Strategy
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        // Find user by username
        const user = await storage.getUserByUsername(username);
        
        // Check if user exists and password matches
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false, { message: "Invalid username or password" });
        }
        
        // Update last login time
        await storage.updateUserLastLogin(user.id);
        
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    })
  );

  // Serialize user to the session
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  // Deserialize user from the session
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Register authentication routes
  setupAuthRoutes(app);
}

// Authentication routes
function setupAuthRoutes(app: Express) {
  // Register new user
  app.post("/api/auth/register", async (req, res, next) => {
    try {
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const existingEmail = await storage.getUserByEmail(req.body.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }

      // Create user with hashed password
      const hashedPassword = await hashPassword(req.body.password);
      const user = await storage.createUser({
        ...req.body,
        password: hashedPassword,
      });

      // Log user in automatically after registration
      req.login(user, (err) => {
        if (err) return next(err);
        
        // Return user info without password
        const { password, ...userInfo } = user;
        res.status(201).json(userInfo);
      });
    } catch (error) {
      console.error("Registration error:", error);
      // Provide a more specific error message for database issues
      if (error instanceof Error) {
        if (error.message.includes("column") && error.message.includes("does not exist")) {
          return res.status(500).json({ 
            message: "Database schema error. Please try again or contact support.",
            error: error.message
          });
        }
      }
      
      return res.status(500).json({ 
        message: "Failed to register user", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Login user
  app.post("/api/auth/login", (req, res, next) => {
    try {
      // Validate login data
      const validatedData = loginSchema.safeParse(req.body);
      if (!validatedData.success) {
        return res.status(400).json({ 
          message: "Invalid login data", 
          errors: validatedData.error.errors 
        });
      }
      
      passport.authenticate("local", (err: Error, user: SelectUser) => {
        if (err) return next(err);
        if (!user) {
          return res.status(401).json({ message: "Invalid username or password" });
        }
        
        req.login(user, (err) => {
          if (err) return next(err);
          
          // Return user info without password
          const { password, ...userInfo } = user;
          res.status(200).json(userInfo);
        });
      })(req, res, next);
    } catch (error) {
      next(error);
    }
  });

  // Logout user
  app.post("/api/auth/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      req.session.destroy((err) => {
        if (err) return next(err);
        // Ensure we clear the cookie with the same settings that were used to set it
        res.clearCookie('connect.sid', { 
          path: '/',
          httpOnly: true,
          secure: false,
          sameSite: 'lax'
        });
        res.status(200).json({ message: "Logged out successfully" });
      });
    });
  });

  // Get current user
  app.get("/api/auth/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    // Return user info without password
    const { password, ...userInfo } = req.user as SelectUser;
    res.json(userInfo);
  });

  // Update user profile
  app.put("/api/auth/profile", isAuthenticated, async (req, res, next) => {
    try {
      const userId = (req.user as SelectUser).id;
      const updatedUser = await storage.updateUserProfile(userId, req.body);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Return updated user info without password
      const { password, ...userInfo } = updatedUser;
      res.json(userInfo);
    } catch (error) {
      next(error);
    }
  });

  // Change password
  app.post("/api/auth/password", isAuthenticated, async (req, res, next) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = (req.user as SelectUser).id;
      
      // Get current user
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Verify current password
      const isPasswordValid = await comparePasswords(currentPassword, user.password);
      if (!isPasswordValid) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }
      
      // Hash new password and update
      const hashedPassword = await hashPassword(newPassword);
      await storage.updateUserPassword(userId, hashedPassword);
      
      res.json({ message: "Password updated successfully" });
    } catch (error) {
      next(error);
    }
  });
}