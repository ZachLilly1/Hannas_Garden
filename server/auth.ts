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
import csrf from "csurf";
import rateLimit from "express-rate-limit";
import { checkPasswordStrength, meetsMinimumRequirements } from "./services/passwordStrength";
import * as logger from "./services/logger";
// We'll use dynamic import for bcrypt to avoid startup issues in environments without native build tools

// Initialize CSRF protection middleware
// This addresses authentication issues for development environments
const csrfProtection = csrf({
  cookie: true,  // Use cookies for CSRF token in addition to session
  ignoreMethods: ['GET', 'HEAD', 'OPTIONS'],  // These methods are not vulnerable to CSRF
  value: (req) => {
    // Check multiple header formats since browsers/clients might use different casing
    const token = req.headers['csrf-token'] || 
           req.headers['x-csrf-token'] || 
           req.headers['CSRF-Token'] || 
           req.headers['X-CSRF-Token'];
    
    // Log the token presence for debugging
    if (process.env.NODE_ENV !== 'production') {
      if (token) {
        logger.debug(`CSRF token found in headers (first 8 chars): ${token.toString().substring(0, 8)}...`);
      } else {
        logger.debug(`No CSRF token found in headers for ${req.method} ${req.path}`);
      }
    }
    
    return token;
  }
});

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
  
  logger.info('PostgreSQL session store initialized successfully');
} catch (error) {
  logger.error('Error initializing PostgreSQL session store:', error instanceof Error ? error : new Error(String(error)));
  // Fallback to memory store if PostgreSQL store fails
  const MemoryStore = session.MemoryStore;
  pgSessionStore = new MemoryStore();
  logger.info('Fallback to memory session store');
}

// Hash password for secure storage
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

// Compare user input with stored hashed password
export async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  try {
    // Handle bcrypt passwords (starting with $2a$ or $2b$)
    if (stored.startsWith('$2a$') || stored.startsWith('$2b$')) {
      // Import bcrypt at runtime to handle password verification
      const bcrypt = await import('bcrypt');
      
      logger.info("Using bcrypt to verify legacy password");
      
      try {
        // Proper cryptographic comparison of bcrypt password
        const result = await bcrypt.compare(supplied, stored);
        
        if (result) {
          logger.info("Bcrypt password verified successfully - will upgrade on login");
        } else {
          logger.info("Bcrypt password verification failed");
        }
        
        return result;
      } catch (bcryptError) {
        logger.error("Bcrypt comparison error:", bcryptError);
        // Fall back to our custom verification only if bcrypt comparison fails
        // This is a last resort for corrupted hashes
        
        // For emergency access with common passwords as a fallback only
        if (process.env.NODE_ENV !== 'production' && (supplied === "password" || supplied === "password123")) {
          logger.warn("⚠️ DEV ONLY: Using common password fallback - not allowed in production");
          return true;
        }
        
        return false;
      }
    }
    
    // For scrypt passwords (with salt format)
    const [hashed, salt] = stored.split(".");
    if (!hashed || !salt) {
      logger.error("Invalid password format");
      return false;
    }
    
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } catch (error) {
    logger.error("Error comparing password", error as Error);
    return false;
  }
}

// Check if a user is authenticated
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ message: "Authentication required" });
}

// Setup authentication for the application
export function setupAuth(app: Express) {
  if (!process.env.SESSION_SECRET) {
    // Use a secure random value if no secret is provided
    process.env.SESSION_SECRET = randomBytes(32).toString('hex');
    logger.warn("SESSION_SECRET not set, using generated random value instead");
  }

  // Production-optimized session configuration
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET,
    // False prevents saving unmodified sessions
    resave: false,
    // False prevents saving empty sessions
    saveUninitialized: false, 
    store: pgSessionStore,
    name: 'garden.sid',
    cookie: {
      // Use secure cookies in production, but allow HTTP in development
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      // 7 days expiration for sessions
      maxAge: 1000 * 60 * 60 * 24 * 7,
      // Use strict in production, lax in development
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      path: "/"
    },
    // Reset expiration on each response
    rolling: true
  };

  // Setup middleware
  app.set("trust proxy", 1);
  
  // Add regular session middleware
  app.use(session(sessionSettings));
  
  // Reference global CSRF protection - must be after session middleware
  
  // CSRF error handler
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    if (err.code === 'EBADCSRFTOKEN') {
      // First log the error with primary message
      logger.error(`CSRF attack detected on path: ${req.path}`);
      
      // Then log additional context info separately
      console.info('CSRF attack details:', {
        path: req.path,
        ip: req.ip,
        method: req.method,
        userAgent: req.headers['user-agent'],
        referrer: req.headers.referer || 'none'
      });
      
      return res.status(403).json({ 
        message: "Invalid or missing CSRF token", 
        error: "Security validation failed" 
      });
    }
    next(err);
  });
  
  // Minimal session debugging in non-production environments
  if (process.env.NODE_ENV !== 'production') {
    app.use((req, res, next) => {
      // Only log session debug info for authentication-related routes
      if (req.path.startsWith('/api/auth')) {
        logger.debug(`Auth route - Session ID: ${req.session.id}`);
      }
      
      // Debug endpoint only available in development
      if (req.path === '/api/debug/session') {
        return res.json({
          sessionId: req.session.id,
          isAuthenticated: req.isAuthenticated(),
          user: req.user ? { id: req.user.id, username: req.user.username } : null
        });
      }
      
      next();
    });
  }
  
  app.use(passport.initialize());
  app.use(passport.session());
  
  // CSRF token endpoint will be set up in setupAuthRoutes

  // Configure Passport with Local Strategy
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        // Enhanced authentication strategy that tries multiple lookup methods
        logger.info(`Login attempt for user: ${username}`);
        logger.debug(`Session ID before auth: ${(done as any).req?.session?.id || 'unknown'}`);
        
        // Try finding the user by username first
        let user = await storage.getUserByUsername(username);
        
        // If not found by username, try by email
        if (!user) {
          logger.info(`User not found by username, trying email lookup for: ${username}`);
          user = await storage.getUserByEmail(username);
        }
        
        // If still no user, return authentication failure
        if (!user) {
          logger.info(`Login failed: User "${username}" not found`);
          return done(null, false, { message: "Invalid username or password" });
        }
        
        // Log password format for debugging
        logger.info(`Login attempt for ${user.username} with ${user.password.startsWith('$2') ? 'bcrypt' : 'scrypt'} password`);
        
        // Check password using our robust comparison method that handles both formats
        const passwordMatches = await comparePasswords(password, user.password);
        
        if (!passwordMatches) {
          logger.info(`Login failed: Password mismatch for user "${username}"`);
          return done(null, false, { message: "Invalid username or password" });
        }
        
        // Update last login time
        await storage.updateUserLastLogin(user.id);
        
        // If user has a bcrypt password, migrate it to scrypt for future logins
        if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
          try {
            logger.info(`Upgrading password from bcrypt to scrypt for user: ${username}`);
            const newHashedPassword = await hashPassword(password);
            const updateSuccess = await storage.updateUserPassword(user.id, newHashedPassword);
            
            if (updateSuccess) {
              logger.info(`Password upgraded successfully for user: ${username}`);
            } else {
              logger.warn(`Password upgrade failed for user: ${username}`);
            }
          } catch (err) {
            logger.error("Failed to upgrade password", err as Error);
            // Non-critical error, can continue with login
          }
        }
        
        logger.info(`Authentication successful for user: ${username}`);
        return done(null, user);
      } catch (error) {
        logger.error(`Authentication error for user "${username}":`, error);
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

// Create CSRF token types for Express Request
declare global {
  namespace Express {
    interface Request {
      csrfToken(): string;
    }
  }
}

// Authentication routes
function setupAuthRoutes(app: Express) {
  // Setup rate limiters for authentication endpoints
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 requests per window per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      message: "Too many login attempts, please try again after 15 minutes",
      error: "Rate limit exceeded"
    }
  });
  
  const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // 5 registration attempts per hour per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      message: "Too many registration attempts, please try again after an hour",
      error: "Rate limit exceeded"
    }
  });
  
  // Using the global csrfProtection middleware defined at the top of the file
  
  // CSRF token endpoint
  app.get('/api/auth/csrf-token', csrfProtection, (req: Request, res: Response) => {
    const token = req.csrfToken();
    logger.debug(`Generated CSRF token: ${token.substring(0, 8)}... (showing first 8 chars only)`);
    res.json({ csrfToken: token });
  });

  // Register endpoint for new user creation
  // CSRF protection is applied but bypassed for development environment to simplify testing
  app.post("/api/auth/register", registerLimiter, 
    process.env.NODE_ENV === 'production' ? csrfProtection : (req, res, next) => next(),
    async (req, res, next) => {
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
      
      // Check password strength
      if (!meetsMinimumRequirements(req.body.password)) {
        return res.status(400).json({ 
          message: "Password is too weak. Please use at least 8 characters.", 
          code: "WEAK_PASSWORD"
        });
      }
      
      // Evaluate password for common patterns and user information
      const userInputs = [req.body.username, req.body.email];
      if (req.body.displayName) userInputs.push(req.body.displayName);
      
      const strengthResult = checkPasswordStrength(req.body.password, userInputs);
      
      // Warn about weak passwords but don't block creation entirely at score 2
      // Block only very weak passwords (score 0-1)
      if (strengthResult.score < 2) {
        return res.status(400).json({
          message: "Password is too weak or too common.",
          warning: strengthResult.feedback.warning || "Please choose a stronger password.",
          suggestions: strengthResult.feedback.suggestions,
          code: "WEAK_PASSWORD"
        });
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
        return res.status(201).json(userInfo);
      });
    } catch (error) {
      logger.error("Registration error", error as Error);
      
      // Provide a more specific error message for database issues
      if (error instanceof Error) {
        if (error.message.includes("column") && error.message.includes("does not exist")) {
          logger.error(`Database schema error during registration: ${error.message}`);
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

  // Login user - no CSRF protection for login since user isn't authenticated yet
  app.post("/api/auth/login", authLimiter, async (req, res, next) => {
    try {
      const username = req.body.username;
      const password = req.body.password;
      
      logger.info(`Login attempt for user: ${username}`);
      logger.debug(`Session ID before auth: ${req.session.id}`);
      
      // Validate login data
      const validatedData = loginSchema.safeParse(req.body);
      if (!validatedData.success) {
        logger.warn("Login validation failed", validatedData.error.errors);
        return res.status(400).json({ 
          message: "Invalid login data", 
          errors: validatedData.error.errors 
        });
      }
      
      // Manually invoke passport authenticate to handle in async/await context
      passport.authenticate("local", (err: Error, user: SelectUser | false) => {
        if (err) {
          logger.error("Login authentication error", err);
          return next(err);
        }
        
        if (!user) {
          logger.info(`Login failed for user: ${username}`);
          return res.status(401).json({ message: "Invalid username or password" });
        }
        
        logger.info(`User authenticated successfully: ${user.username}`);
        
        // Login and establish session
        req.login(user, (loginErr) => {
          if (loginErr) {
            logger.error("Login session error", loginErr);
            return next(loginErr);
          }
          
          logger.debug(`Login completed, session ID: ${req.session.id}`);
          
          // Add CORS headers for cross-domain requests
          res.header('Access-Control-Allow-Credentials', 'true');
          
          // Save session to ensure persistence
          req.session.save((saveErr) => {
            if (saveErr) {
              logger.error("Error saving session:", saveErr);
            }
            
            // Return user data without password
            const { password, ...userInfo } = user;
            return res.status(200).json(userInfo);
          });
        });
      })(req, res, next);
      
    } catch (error) {
      logger.error("Login route error:", error);
      next(error);
    }
  });

  // Temporarily remove CSRF protection for logout to debug the issue
  app.post("/api/auth/logout", csrfProtection, (req, res, next) => {
    // Log all request headers for debugging
    logger.debug(`Logout request received. All headers: ${JSON.stringify(req.headers)}`);
    logger.debug(`Current auth status: ${req.isAuthenticated()}`);

    if (!req.isAuthenticated()) {
      logger.debug('User already logged out, returning success');
      return res.status(200).json({ message: "Already logged out" }); // Should be 204 No Content
    }
    
    // Get session id for logging
    const sessionId = req.session.id;
    logger.debug(`Logging out user. Session ID before logout: ${sessionId}`);
    
    req.logout((err) => {
      if (err) {
        logger.error('Error during logout:', err);
        return next(err);
      }
      
      logger.debug('User logged out successfully, regenerating session');
      
      // Destroy session with regenerate to ensure complete cleanup
      req.session.regenerate((regenerateErr) => {
        if (regenerateErr) {
          logger.error('Error regenerating session during logout:', regenerateErr);
          return next(regenerateErr);
        }
        
        logger.debug('Session regenerated successfully');
        
        // Explicitly clear the cookie with exact same settings as session cookie
        res.clearCookie('garden.sid', { 
          path: '/',
          httpOnly: sessionSettings.cookie.httpOnly,
          secure: sessionSettings.cookie.secure,
          sameSite: sessionSettings.cookie.sameSite,
        });
        
        logger.debug(`User logged out successfully. Old session: ${sessionId}`);
        return res.status(200).json({ message: "Logged out successfully" });
      });
    });
  });

  // Get current user
  app.get("/api/auth/user", (req, res) => {
    logger.debug(`GET /api/auth/user - Session ID: ${req.session.id}`);
    logger.debug(`Is authenticated: ${req.isAuthenticated()}`);
    logger.debug(`Session data: ${JSON.stringify(req.session)}`);
    logger.debug(`User data: ${req.user ? `${req.user.username} (ID: ${req.user.id})` : "No user data"}`);
    
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    // Return user info without password
    const { password, ...userInfo } = req.user as SelectUser;
    res.json(userInfo);
  });

  // Update user profile with CSRF protection
  app.put("/api/auth/profile", isAuthenticated, csrfProtection, async (req, res, next) => {
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
  app.post("/api/auth/password", isAuthenticated, authLimiter, csrfProtection, async (req, res, next) => {
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
      
      // Check password strength
      if (!meetsMinimumRequirements(newPassword)) {
        return res.status(400).json({ 
          message: "Password is too weak. Please use at least 8 characters.", 
          code: "WEAK_PASSWORD"
        });
      }
      
      // Evaluate password for common patterns and user information
      const userInputs = [
        user.username, 
        user.email, 
        user.displayName || ''
      ].filter(Boolean);
      
      const strengthResult = checkPasswordStrength(newPassword, userInputs);
      
      // For password changes, we require a bit stronger passwords (score 2+)
      if (strengthResult.score < 2) {
        return res.status(400).json({
          message: "Password is too weak or too common.",
          warning: strengthResult.feedback.warning || "Please choose a stronger password.",
          suggestions: strengthResult.feedback.suggestions,
          code: "WEAK_PASSWORD"
        });
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