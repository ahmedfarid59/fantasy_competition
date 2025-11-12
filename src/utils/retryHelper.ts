/**
 * API Retry Utility
 * Provides automatic retry logic for failed API calls with exponential backoff
 */

import { Alert } from 'react-native';

interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  showRetryDialog?: boolean;
  onRetry?: (attempt: number) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  showRetryDialog: true,
  onRetry: () => {},
};

/**
 * Execute an async operation with automatic retry on failure
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: unknown;
  let delay = opts.initialDelay;

  for (let attempt = 1; attempt <= opts.maxRetries; attempt++) {
    try {
      console.log(`🔄 [RETRY] Attempt ${attempt}/${opts.maxRetries}`);
      return await operation();
    } catch (error) {
      lastError = error;
      const isLastAttempt = attempt === opts.maxRetries;

      if (isLastAttempt) {
        console.error(`❌ [RETRY] All ${opts.maxRetries} attempts failed`);
        break;
      }

      // Check if error is retryable
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isNetworkError = 
        errorMessage.includes('Network') ||
        errorMessage.includes('Cannot connect') ||
        errorMessage.includes('timed out') ||
        errorMessage.includes('Failed to fetch');

      if (!isNetworkError) {
        console.log(`⚠️ [RETRY] Non-retryable error, aborting retry`);
        throw error;
      }

      console.warn(`⚠️ [RETRY] Attempt ${attempt} failed:`, errorMessage);
      console.log(`⏳ [RETRY] Waiting ${delay}ms before retry...`);

      // Notify caller
      opts.onRetry(attempt);

      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, delay));

      // Increase delay for next attempt (exponential backoff)
      delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelay);
    }
  }

  // All retries failed
  throw lastError;
}

/**
 * Execute an async operation with retry and user confirmation dialog
 */
export async function withRetryDialog<T>(
  operation: () => Promise<T>,
  options: {
    operationName?: string;
    maxRetries?: number;
  } = {}
): Promise<T> {
  const { operationName = 'operation', maxRetries = 3 } = options;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 [RETRY DIALOG] Attempt ${attempt}/${maxRetries} for ${operationName}`);
      return await operation();
    } catch (error) {
      lastError = error;
      const isLastAttempt = attempt === maxRetries;
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Check if error is retryable
      const isNetworkError =
        errorMessage.includes('Network') ||
        errorMessage.includes('Cannot connect') ||
        errorMessage.includes('timed out') ||
        errorMessage.includes('Failed to fetch');

      if (!isNetworkError) {
        // Not a network error, don't retry
        throw error;
      }

      if (isLastAttempt) {
        // Last attempt failed, throw error
        console.error(`❌ [RETRY DIALOG] All ${maxRetries} attempts failed for ${operationName}`);
        throw error;
      }

      // Show retry dialog
      const shouldRetry = await new Promise<boolean>((resolve) => {
        Alert.alert(
          'Connection Error',
          `${errorMessage}\n\nAttempt ${attempt}/${maxRetries}\n\nWould you like to try again?`,
          [
            {
              text: 'Cancel',
              onPress: () => resolve(false),
              style: 'cancel',
            },
            {
              text: 'Retry',
              onPress: () => resolve(true),
            },
          ],
          { cancelable: false }
        );
      });

      if (!shouldRetry) {
        console.log(`⚠️ [RETRY DIALOG] User cancelled retry for ${operationName}`);
        throw error;
      }

      console.log(`🔄 [RETRY DIALOG] User confirmed retry for ${operationName}`);
    }
  }

  throw lastError;
}

/**
 * Check if an error is retryable (network-related)
 */
export function isRetryableError(error: unknown): boolean {
  const errorMessage = error instanceof Error ? error.message : String(error);
  return (
    errorMessage.includes('Network') ||
    errorMessage.includes('Cannot connect') ||
    errorMessage.includes('timed out') ||
    errorMessage.includes('Failed to fetch') ||
    errorMessage.includes('ECONNREFUSED') ||
    errorMessage.includes('ETIMEDOUT') ||
    errorMessage.includes('ENETUNREACH')
  );
}

/**
 * Execute multiple operations in parallel with retry
 */
export async function withRetryParallel<T>(
  operations: Array<() => Promise<T>>,
  options: RetryOptions = {}
): Promise<T[]> {
  const promises = operations.map((op) => withRetry(op, options));
  return Promise.all(promises);
}

/**
 * Simple delay function
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
