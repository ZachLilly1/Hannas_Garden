import zxcvbn from 'zxcvbn';

export interface PasswordStrengthResult {
  score: number;  // 0-4, with 4 being the strongest
  feedback: {
    warning: string;
    suggestions: string[];
  };
  isStrong: boolean;
}

/**
 * Checks password strength using zxcvbn library
 * @param password The password to check
 * @param userInputs Additional user information to check against (email, username, etc.)
 * @returns Password strength result with score, feedback, and strength assessment
 */
export function checkPasswordStrength(
  password: string, 
  userInputs: string[] = []
): PasswordStrengthResult {
  // Run zxcvbn check
  const result = zxcvbn(password, userInputs);
  
  return {
    score: result.score,
    feedback: {
      warning: result.feedback.warning || '',
      suggestions: result.feedback.suggestions || [],
    },
    // Consider passwords with score 3+ as strong enough
    isStrong: result.score >= 3
  };
}

/**
 * Provides a human-readable password policy description
 */
export function getPasswordPolicyDescription(): string {
  return `
    Password must:
    - Be at least 8 characters long
    - Not be commonly used or easily guessable
    - Not be similar to your personal information
    - Preferably include a mix of upper and lowercase letters, numbers, and symbols
  `;
}

/**
 * Evaluates if a password meets minimum requirements
 * @param password The password to evaluate
 * @returns True if password meets minimum requirements
 */
export function meetsMinimumRequirements(password: string): boolean {
  // At minimum, require 8+ characters
  return password.length >= 8;
}