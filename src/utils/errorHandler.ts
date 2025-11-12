/**
 * Centralized Error Handler for Fantasy Competition App
 * Provides consistent error handling and user-friendly messages
 */

import { Alert } from 'react-native';
import { ApiResponse } from '../services/api';

export interface ErrorContext {
  screen?: string;
  function?: string;
  operation?: string;
  data?: any;
  timestamp?: string;
}

export interface ErrorHandlerOptions {
  showAlert?: boolean;
  title?: string;
  logError?: boolean;
  onError?: (error: string) => void;
  fallbackMessage?: string;
  context?: ErrorContext;
}

export class ErrorHandler {
  /**
   * Get user-friendly error message based on error type
   */
  static getUserFriendlyMessage(error: string, statusCode?: number): string {
    // Authentication errors
    if (statusCode === 401 || error.includes('Unauthorized') || error.includes('Authentication')) {
      return 'Your session has expired. Please log out and log in again.';
    }

    // Authorization errors
    if (statusCode === 403 || error.includes('Forbidden') || error.includes('Access denied')) {
      return 'You do not have permission to perform this action.';
    }

    // Not found errors
    if (statusCode === 404 || error.includes('not found')) {
      return 'The requested resource was not found. Please refresh and try again.';
    }

    // Validation errors
    if (statusCode === 422 || error.includes('validation') || error.includes('invalid')) {
      return error; // Use specific validation message
    }

    // Network errors
    if (error.includes('Network') || error.includes('Cannot connect') || error.includes('timed out')) {
      return 'Cannot connect to server. Please check your internet connection and server settings.';
    }

    // Server errors
    if (statusCode && statusCode >= 500) {
      return 'Server error occurred. Please try again later.';
    }

    // Database errors
    if (error.includes('Database')) {
      return 'Database error occurred. Please try again later.';
    }

    // Budget/business logic errors
    if (error.includes('Budget')) {
      return error; // Use specific budget message
    }

    // Team errors
    if (error.includes('team') || error.includes('players')) {
      return error; // Use specific team message
    }

    // Default: return original error if it's user-friendly, otherwise generic message
    if (error.length < 150 && !error.includes('Error:') && !error.includes('Exception')) {
      return error;
    }

    return 'An error occurred. Please try again.';
  }

  /**
   * Handle API response error
   */
  static handleApiError<T>(
    response: ApiResponse<T>,
    options: ErrorHandlerOptions = {}
  ): void {
    const {
      showAlert = true,
      title = 'Error',
      logError = true,
      onError,
      fallbackMessage = 'An error occurred. Please try again.',
      context,
    } = options;

    if (!response.success && response.error) {
      const errorMessage = this.getUserFriendlyMessage(
        response.error,
        response.statusCode
      );

      if (logError) {
        console.error('❌ [ERROR HANDLER] API Error:', {
          timestamp: new Date().toISOString(),
          screen: context?.screen || 'Unknown',
          function: context?.function || 'Unknown',
          operation: context?.operation || 'Unknown',
          error: response.error,
          statusCode: response.statusCode,
          errors: response.errors,
          friendlyMessage: errorMessage,
          data: context?.data,
        });
        
        // Log stack trace if available
        if (response.error) {
          console.error('📍 [ERROR LOCATION]:', {
            screen: context?.screen,
            function: context?.function,
            operation: context?.operation,
          });
        }
      }

      if (showAlert) {
        Alert.alert(title, errorMessage, [{ text: 'OK' }]);
      }

      if (onError) {
        onError(errorMessage);
      }
    }
  }

  /**
   * Handle generic error
   */
  static handleError(
    error: unknown,
    options: ErrorHandlerOptions = {}
  ): void {
    const {
      showAlert = true,
      title = 'Error',
      logError = true,
      onError,
      fallbackMessage = 'An unexpected error occurred. Please try again.',
      context,
    } = options;

    let errorMessage = fallbackMessage;
    let errorStack: string | undefined;

    if (error instanceof Error) {
      errorMessage = this.getUserFriendlyMessage(error.message);
      errorStack = error.stack;
    } else if (typeof error === 'string') {
      errorMessage = this.getUserFriendlyMessage(error);
    }

    if (logError) {
      console.error('❌ [ERROR HANDLER] Error:', {
        timestamp: new Date().toISOString(),
        screen: context?.screen || 'Unknown',
        function: context?.function || 'Unknown',
        operation: context?.operation || 'Unknown',
        error,
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        friendlyMessage: errorMessage,
        data: context?.data,
      });
      
      // Log location context
      console.error('📍 [ERROR LOCATION]:', {
        screen: context?.screen,
        function: context?.function,
        operation: context?.operation,
      });
      
      // Log stack trace if available
      if (errorStack) {
        console.error('📚 [STACK TRACE]:', errorStack);
      }
    }

    if (showAlert) {
      Alert.alert(title, errorMessage, [{ text: 'OK' }]);
    }

    if (onError) {
      onError(errorMessage);
    }
  }

  /**
   * Check if error is authentication related
   */
  static isAuthError(response: ApiResponse<any>): boolean {
    return (
      response.statusCode === 401 ||
      (response.error?.includes('Unauthorized') ?? false) ||
      (response.error?.includes('Authentication') ?? false) ||
      (response.error?.includes('session') ?? false) ||
      (response.error?.includes('log in') ?? false)
    );
  }

  /**
   * Check if error is authorization related
   */
  static isAuthorizationError(response: ApiResponse<any>): boolean {
    return (
      response.statusCode === 403 ||
      (response.error?.includes('Forbidden') ?? false) ||
      (response.error?.includes('Access denied') ?? false) ||
      (response.error?.includes('permission') ?? false)
    );
  }

  /**
   * Check if error is network related
   */
  static isNetworkError(response: ApiResponse<any>): boolean {
    return (
      (response.error?.includes('Network') ?? false) ||
      (response.error?.includes('Cannot connect') ?? false) ||
      (response.error?.includes('timed out') ?? false) ||
      (response.error?.includes('Failed to fetch') ?? false)
    );
  }

  /**
   * Format validation errors for display
   */
  static formatValidationErrors(errors?: string[]): string {
    if (!errors || errors.length === 0) {
      return 'Validation failed. Please check your input.';
    }

    if (errors.length === 1) {
      return errors[0];
    }

    return 'Validation errors:\n• ' + errors.join('\n• ');
  }

  /**
   * Retry handler with exponential backoff
   */
  static async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    initialDelay: number = 1000,
    context?: ErrorContext
  ): Promise<T> {
    let lastError: unknown;

    console.log('🔄 [RETRY] Starting retry operation:', {
      screen: context?.screen,
      function: context?.function,
      operation: context?.operation,
      maxRetries,
      initialDelay,
    });

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        console.log(`🔄 [RETRY] Attempt ${attempt + 1}/${maxRetries}:`, {
          screen: context?.screen,
          function: context?.function,
        });
        return await operation();
      } catch (error) {
        lastError = error;
        console.warn(`⚠️ [RETRY] Attempt ${attempt + 1}/${maxRetries} failed:`, {
          screen: context?.screen,
          function: context?.function,
          error: error instanceof Error ? error.message : error,
        });

        if (attempt < maxRetries - 1) {
          const delay = initialDelay * Math.pow(2, attempt);
          console.log(`⏳ [RETRY] Waiting ${delay}ms before retry...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    console.error('❌ [RETRY] All retry attempts failed:', {
      screen: context?.screen,
      function: context?.function,
      error: lastError instanceof Error ? lastError.message : lastError,
    });

    throw lastError;
  }

  /**
   * Log operation start for debugging
   */
  static logOperation(context: ErrorContext, additionalData?: any): void {
    console.log('🔵 [OPERATION START]:', {
      timestamp: new Date().toISOString(),
      screen: context.screen,
      function: context.function,
      operation: context.operation,
      data: additionalData || context.data,
    });
  }

  /**
   * Log operation success for debugging
   */
  static logSuccess(context: ErrorContext, result?: any): void {
    console.log('✅ [OPERATION SUCCESS]:', {
      timestamp: new Date().toISOString(),
      screen: context.screen,
      function: context.function,
      operation: context.operation,
      result: result ? JSON.stringify(result).substring(0, 200) : 'No result data',
    });
  }
}
