/**
 * Environment configuration and validation for the frontend.
 * 
 * This module validates that required environment variables are set
 * and provides type-safe access to configuration values.
 */

// Required environment variables
const REQUIRED_ENV_VARS = {
  // None strictly required for development, but these should be set in production
} as const;

// Optional environment variables with defaults
const ENV_CONFIG = {
  // API base URL for server-side requests.
  // In Docker: set NEXT_PUBLIC_API_BASE=http://backend:8000
  // Local dev: defaults to http://localhost:8000
  API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000',
  
  // Public site URL (for SEO, sitemaps, etc.)
  SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
  
  // Environment name
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  
  // Feature flags
  ENABLE_ANALYTICS: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === '1',
} as const;

// Validate required environment variables
function validateEnv(): void {
  const missing: string[] = [];
  
  for (const [key] of Object.entries(REQUIRED_ENV_VARS)) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }
  
  if (missing.length > 0 && process.env.NODE_ENV === 'production') {
    console.error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
    // In production, we might want to fail hard
    // throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

// Run validation on module load
validateEnv();

// Export configuration
export const config = ENV_CONFIG;

// Helper to check if we're in production
export const isProduction = ENV_CONFIG.NODE_ENV === 'production';

// Helper to check if we're in development
export const isDevelopment = ENV_CONFIG.NODE_ENV === 'development';

// API URL helper that handles both server-side and client-side requests
export function getApiUrl(path: string): string {
  // Remove leading slash if present
  let cleanPath = path.startsWith('/') ? path.slice(1) : path;
  
  // Normalize: strip "v1/" prefix if present so callers can pass with or without it
  if (cleanPath.startsWith('v1/')) {
    cleanPath = cleanPath.slice(3);
  } else if (cleanPath === 'v1') {
    cleanPath = '';
  }
  
  // For server-side requests, use the internal Docker network URL
  if (typeof window === 'undefined') {
    return `${ENV_CONFIG.API_BASE_URL}/v1/${cleanPath}`;
  }
  
  // For client-side requests, use the Next.js proxy (/v1/[[...path]]/route.ts)
  return `/v1/${cleanPath}`;
}
