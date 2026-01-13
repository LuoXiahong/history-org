import { SkipThrottle, Throttle } from '@nestjs/throttler';

/**
 * Skip rate limiting for this route
 */
export const NoRateLimit = () => SkipThrottle();

/**
 * Apply strict rate limiting (3 requests per second)
 */
export const StrictRateLimit = () =>
  Throttle({ short: { limit: 3, ttl: 1000 } });

/**
 * Apply auth-specific rate limiting (5 attempts per minute)
 */
export const AuthRateLimit = () => Throttle({ long: { limit: 5, ttl: 60000 } });

/**
 * Apply relaxed rate limiting for read operations
 */
export const RelaxedRateLimit = () =>
  Throttle({ medium: { limit: 50, ttl: 10000 } });
