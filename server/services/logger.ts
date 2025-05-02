/**
 * Centralized logger for the application
 * Handles different log levels based on environment
 */

// Log levels in order of verbosity
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// Minimum log level by environment
const minimumLevels: Record<string, LogLevel> = {
  production: 'warn', // Only warnings and errors in production
  test: 'info',       // Info and above in test
  development: 'debug', // Everything in development
};

// Get current environment, defaulting to development
const currentEnv = process.env.NODE_ENV || 'development';

// Determine minimum log level for current environment
const minimumLevel = minimumLevels[currentEnv] || 'debug';

// Log level priorities (higher number = higher priority)
const levelPriorities: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Determines if a given log level should be displayed
 * @param level The log level to check
 * @returns Whether the log should be displayed
 */
function shouldLog(level: LogLevel): boolean {
  return levelPriorities[level] >= levelPriorities[minimumLevel];
}

/**
 * Debug-level logging (development only)
 * @param message Message to log
 * @param meta Additional data to log
 */
export function debug(message: string, ...meta: any[]): void {
  if (shouldLog('debug')) {
    console.debug(`DEBUG: ${message}`, ...meta);
  }
}

/**
 * Info-level logging (development and test)
 * @param message Message to log
 * @param meta Additional data to log
 */
export function info(message: string, ...meta: any[]): void {
  if (shouldLog('info')) {
    console.info(`INFO: ${message}`, ...meta);
  }
}

/**
 * Warning-level logging (all environments)
 * @param message Message to log
 * @param meta Additional data to log
 */
export function warn(message: string, ...meta: any[]): void {
  if (shouldLog('warn')) {
    console.warn(`WARNING: ${message}`, ...meta);
  }
}

/**
 * Error-level logging (all environments)
 * @param message Message to log
 * @param error Error object if available (any type, will be converted if needed)
 * @param meta Additional data to log
 */
export function error(message: string, error?: unknown, ...meta: any[]): void {
  if (shouldLog('error')) {
    if (error) {
      // Convert to Error instance if it's not already
      const errorObject = error instanceof Error 
        ? error 
        : new Error(typeof error === 'string' ? error : String(error));
      
      console.error(`ERROR: ${message}`, errorObject, ...meta);
    } else {
      console.error(`ERROR: ${message}`, ...meta);
    }
  }
}

/**
 * Log API request (filtered by environment)
 * @param method HTTP method
 * @param path Request path
 * @param statusCode HTTP status code
 * @param duration Request duration in ms
 */
export function apiRequest(
  method: string,
  path: string,
  statusCode: number,
  duration: number
): void {
  const level: LogLevel = statusCode >= 500 ? 'error' : 
                       statusCode >= 400 ? 'warn' : 
                       path.includes('/auth') ? 'info' : 'debug';
  
  if (shouldLog(level)) {
    const message = `${method} ${path} ${statusCode} in ${duration}ms`;
    
    switch (level) {
      case 'error':
        console.error(`API: ${message}`);
        break;
      case 'warn':
        console.warn(`API: ${message}`);
        break;
      case 'info':
        console.info(`API: ${message}`);
        break;
      default:
        console.debug(`API: ${message}`);
    }
  }
}

export default {
  debug,
  info,
  warn,
  error,
  apiRequest
};