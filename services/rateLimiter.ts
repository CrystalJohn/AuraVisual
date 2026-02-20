
export class RateLimiter {
  private static instance: RateLimiter;
  
  // Relaxed limits for parallel processing
  private readonly RPD_LIMIT = 250;
  
  // State
  private dailyRequestCount: number = 0;
  private lastResetDate: string = new Date().toDateString();

  private constructor() {
    this.loadFromStorage();
  }

  public static getInstance(): RateLimiter {
    if (!RateLimiter.instance) {
      RateLimiter.instance = new RateLimiter();
    }
    return RateLimiter.instance;
  }

  private loadFromStorage() {
    try {
      if (typeof window !== 'undefined') {
        const storedDate = localStorage.getItem('aura_quota_date');
        const storedCount = localStorage.getItem('aura_quota_count');
        const today = new Date().toDateString();
        if (storedDate === today && storedCount) {
          this.dailyRequestCount = parseInt(storedCount, 10);
          this.lastResetDate = today;
        } else {
          this.dailyRequestCount = 0;
          this.lastResetDate = today;
          this.saveToStorage();
        }
      }
    } catch (e) {
      console.warn("RateLimiter: Failed to access localStorage", e);
    }
  }

  private saveToStorage() {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('aura_quota_date', this.lastResetDate);
        localStorage.setItem('aura_quota_count', this.dailyRequestCount.toString());
      }
    } catch (e) { /* ignore */ }
  }

  /**
   * Track a new request. Only checks daily limit now — no cooldown, no RPM throttle.
   */
  public trackRequest(): void {
    if (this.lastResetDate !== new Date().toDateString()) {
       this.dailyRequestCount = 0;
       this.lastResetDate = new Date().toDateString();
    }
    if (this.dailyRequestCount >= this.RPD_LIMIT) {
      throw new Error(`Daily quota exceeded (${this.RPD_LIMIT} requests). Please try again tomorrow.`);
    }
    this.dailyRequestCount++;
    this.saveToStorage();
  }

  public getQuotaInfo() {
    return {
      dailyCount: this.dailyRequestCount,
      dailyLimit: this.RPD_LIMIT,
      remaining: this.RPD_LIMIT - this.dailyRequestCount,
    };
  }
}

// Helper for retry logic — still useful for transient errors
export const withRetry = async <T>(
  fn: () => Promise<T>, 
  retries = 3, 
  baseDelay = 2000
): Promise<T> => {
  try {
    return await fn();
  } catch (error: any) {
    if (retries === 0) throw error;
    
    const isRetryable = error.retryable === true ||
                        error.message?.includes('429') || 
                        error.message?.includes('RESOURCE_EXHAUSTED') ||
                        error.status === 429 ||
                        error.status === 503;

    if (isRetryable) {
       const delay = baseDelay * (4 - retries);
       console.warn(`[RateLimiter] Retrying in ${delay}ms... (${retries} left)`);
       await new Promise(resolve => setTimeout(resolve, delay));
       return withRetry(fn, retries - 1, baseDelay * 2);
    }
    
    throw error;
  }
};

export const rateLimiter = RateLimiter.getInstance();
