declare module 'zxcvbn' {
  interface ZxcvbnFeedback {
    warning: string | null;
    suggestions: string[];
  }

  interface ZxcvbnResult {
    password: string;
    guesses: number;
    guesses_log10: number;
    sequence: any[];
    crack_times_seconds: {
      online_throttling_100_per_hour: number;
      online_no_throttling_10_per_second: number;
      offline_slow_hashing_1e4_per_second: number;
      offline_fast_hashing_1e10_per_second: number;
    };
    crack_times_display: {
      online_throttling_100_per_hour: string;
      online_no_throttling_10_per_second: string;
      offline_slow_hashing_1e4_per_second: string;
      offline_fast_hashing_1e10_per_second: string;
    };
    score: number; // 0-4 (0 = too guessable, 4 = very unguessable)
    feedback: ZxcvbnFeedback;
    calc_time: number;
  }

  function zxcvbn(password: string, user_inputs?: string[]): ZxcvbnResult;
  
  export = zxcvbn;
}