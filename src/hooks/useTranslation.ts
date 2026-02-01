/**
 * Translation Hook
 *
 * Custom hook that manages LLM-powered text translation.
 * Integrates with app settings for API configuration.
 *
 * LEARNING NOTES - Real-world API integration:
 * This hook demonstrates several important patterns:
 * - Configuration validation before API calls
 * - HTTP request handling with fetch API
 * - Comprehensive error handling (network, HTTP, parsing)
 * - State management for async operations
 * - Integration with Context (useSettings)
 *
 * USE CASE: User selects text in markdown reader, app translates it
 */

import { useState, useCallback } from 'react';
import { useSettings } from '../contexts/SettingsContext';

/**
 * Translation state interface
 *
 * PATTERN: Discriminated union state
 * Only ONE of these should be truthy at a time:
 * - isTranslating: true → translation and error are null
 * - translation: set → isTranslating false, error null
 * - error: set → isTranslating false, translation null
 */
export interface TranslationState {
  /** Whether translation request is in progress */
  isTranslating: boolean;
  /** Translated text result (null if not translated yet or error occurred) */
  translation: string | null;
  /** Error message if translation failed (null if successful or in progress) */
  error: string | null;
}

/**
 * Custom hook for managing text translation
 *
 * LEARNING NOTE - Hook composition:
 * This hook uses other hooks (useSettings, useState, useCallback).
 * Hooks can call other hooks - this is how you build complex functionality.
 *
 * Handles:
 * - API configuration validation
 * - Network requests to LLM API (using fetch)
 * - Error handling and user feedback
 * - Loading states
 *
 * @returns Translation state and translate function
 *
 * @example
 * ```tsx
 * const { translate, state } = useTranslation();
 *
 * const handleTextSelected = async (text: string) => {
 *   const result = await translate(text);
 *   if (result) {
 *     showDialog(result);
 *   } else if (state.error) {
 *     showError(state.error);
 *   }
 * };
 * ```
 */
export const useTranslation = () => {
  /**
   * Get app settings via Context
   *
   * LEARNING NOTE - Hook composition:
   * We use useSettings() inside useTranslation()
   * This is how hooks access Context without prop drilling
   */
  const { settings } = useSettings();

  /**
   * Translation state
   *
   * PATTERN: Single state object for related fields
   * Unlike useDialog which uses separate states,
   * here we use one object because the fields are mutually exclusive
   */
  const [state, setState] = useState<TranslationState>({
    isTranslating: false,
    translation: null,
    error: null,
  });

  /**
   * Validate API configuration before making request
   *
   * @returns True if configuration is valid, false otherwise
   */
  const validateConfiguration = (): boolean => {
    console.log('[useTranslation] Validating configuration...', {
      translationEnabled: settings.translationEnabled,
      hasApiUrl: !!settings.llmApiUrl,
      hasApiKey: !!settings.llmApiKey,
      hasModel: !!settings.llmModel,
    });

    if (!settings.translationEnabled) {
      console.log('[useTranslation] Translation is disabled in settings');
      setState({
        isTranslating: false,
        translation: null,
        error: 'Translation is disabled. Please enable it in Settings.',
      });
      return false;
    }

    if (!settings.llmApiUrl) {
      console.log('[useTranslation] API URL is not configured');
      setState({
        isTranslating: false,
        translation: null,
        error: 'API URL is not configured. Please set it in Settings.',
      });
      return false;
    }

    if (!settings.llmApiKey) {
      console.log('[useTranslation] API Key is not configured');
      setState({
        isTranslating: false,
        translation: null,
        error: 'API Key is not configured. Please set it in Settings.',
      });
      return false;
    }

    if (!settings.llmModel) {
      console.log('[useTranslation] Model is not configured');
      setState({
        isTranslating: false,
        translation: null,
        error: 'Model is not configured. Please set it in Settings.',
      });
      return false;
    }

    console.log('[useTranslation] Configuration is valid');
    return true;
  };

  /**
   * Translate selected text using configured LLM API
   *
   * LEARNING NOTE - Complex async function:
   * This function demonstrates a complete HTTP request flow:
   * 1. Validation
   * 2. Set loading state
   * 3. Make request
   * 4. Handle response
   * 5. Handle errors
   * 6. Update state
   *
   * @param text - Text to translate
   * @returns Translated text, or null if translation failed/was cancelled
   */
  const translate = useCallback(async (text: string): Promise<string | null> => {
    console.log('[useTranslation] Translate called with text:', text.substring(0, 50));

    /**
     * Step 1: Validate configuration before making request
     * Prevents wasted API calls if settings are missing
     */
    if (!validateConfiguration()) {
      console.log('[useTranslation] Validation failed, showing error dialog');
      return null;
    }

    /**
     * Step 2: Set loading state
     * This triggers UI updates (loading spinner, disabled buttons, etc.)
     */
    console.log('[useTranslation] Starting translation...');
    setState({
      isTranslating: true,
      translation: null,
      error: null,
    });

    try {
      /**
       * Step 3: Prepare request
       *
       * LEARNING NOTE - Template literals for dynamic prompts:
       * Using ${targetLanguage} to inject user's language preference
       */
      const targetLanguage = settings.targetLanguage || 'Spanish';
      const prompt = `Translate the following text to ${targetLanguage}. If the text is already in ${targetLanguage}, rewrite it in a simpler and more understandable way:\n\n${text}`;

      /**
       * Step 4: Make HTTP request
       *
       * LEARNING NOTE - fetch API:
       * Modern browser API for HTTP requests (replaces XMLHttpRequest)
       *
       * STRUCTURE:
       * - URL: Where to send request
       * - method: HTTP verb (GET, POST, etc.)
       * - headers: Metadata (content type, authorization)
       * - body: Request payload (must be stringified JSON)
       *
       * LEARNING NOTE - Non-null assertion (!):
       * settings.llmApiUrl! tells TypeScript "I know this isn't null"
       * Safe here because validateConfiguration() already checked it
       */
      const response = await fetch(settings.llmApiUrl!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.llmApiKey}`,
        },
        body: JSON.stringify({
          model: settings.llmModel,
          messages: [
            {
              role: 'system',
              content: `You are a helpful translation and simplification assistant. When translating, provide ONLY the translated text without any labels, prefixes, or explanations like "Translation:" or "Traducción:". When the text is already in the target language, rewrite it in simpler, clearer language while preserving the meaning. Return ONLY the final text, nothing else.`,
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.3, // Lower = more focused, higher = more creative
        }),
      });

      /**
       * Step 5: Handle HTTP errors
       *
       * LEARNING NOTE - response.ok:
       * fetch() doesn't throw errors for 404, 500, etc.
       * Must manually check response.ok (true if status 200-299)
       *
       * PATTERN: Friendly error messages
       * Convert HTTP status codes to user-friendly messages
       */
      if (!response.ok) {
        const errorMessage = getHttpErrorMessage(response.status, response.statusText);

        setState({
          isTranslating: false,
          translation: null,
          error: errorMessage,
        });

        return null; // Return null to indicate failure
      }

      /**
       * Step 6: Parse response
       *
       * LEARNING NOTE - Optional chaining (?.):
       * data.choices?.[0]?.message?.content
       * - Safely access nested properties
       * - Returns undefined if any level is null/undefined
       * - Prevents "Cannot read property 'X' of undefined" errors
       *
       * LEARNING NOTE - Nullish coalescing (||):
       * value || 'default' → use 'default' if value is falsy
       */
      const data = await response.json();
      const result = data.choices?.[0]?.message?.content || 'No translation available';

      // Success: Update state with translation
      setState({
        isTranslating: false,
        translation: result,
        error: null,
      });

      return result;
    } catch (error) {
      /**
       * Step 7: Handle network/parsing errors
       *
       * LEARNING NOTE - Error handling:
       * catch block catches:
       * - Network failures (no internet, DNS errors, etc.)
       * - JSON parsing errors
       * - Any other runtime errors
       *
       * PATTERN: Type checking errors
       * error is type 'unknown' in TypeScript, must check before using
       */
      console.error('Translation error:', error);

      const errorMessage = error instanceof Error
        ? getNetworkErrorMessage(error)
        : 'Unknown error occurred. Please try again.';

      setState({
        isTranslating: false,
        translation: null,
        error: errorMessage,
      });

      return null;
    }
  }, [settings.llmApiUrl, settings.llmApiKey, settings.llmModel, settings.targetLanguage]); // Dependencies

  /**
   * Clear translation state
   */
  const clearTranslation = useCallback(() => {
    setState({
      isTranslating: false,
      translation: null,
      error: null,
    });
  }, []);

  return {
    translate,
    clearTranslation,
    state,
  };
};

/**
 * Get user-friendly error message for HTTP status codes
 *
 * LEARNING NOTE - Helper functions:
 * Extract complex logic into separate functions for:
 * - Readability: Main logic easier to follow
 * - Reusability: Can use in multiple places
 * - Testability: Can test error messages independently
 *
 * PATTERN: Switch statement for status codes
 * Common HTTP codes and what they mean:
 * - 400: Bad request (client error)
 * - 401: Unauthorized (invalid credentials)
 * - 404: Not found
 * - 429: Too many requests (rate limit)
 * - 500+: Server errors
 */
function getHttpErrorMessage(status: number, statusText: string): string {
  switch (status) {
    case 401:
      return 'Invalid API Key. Please check your credentials in Settings.';
    case 404:
      return 'Invalid API URL or endpoint not found. Please check the URL in Settings.';
    case 429:
      return 'Rate limit exceeded. Please try again later.';
    case 400:
      return 'Invalid request. Please check your Model name in Settings.';
    default:
      // 500, 502, 503, etc. are all server errors
      if (status >= 500) {
        return 'Server error. Please try again later.';
      }
      return `Error ${status}: ${statusText}`;
  }
}

/**
 * Get user-friendly error message for network errors
 *
 * LEARNING NOTE - Error message detection:
 * fetch() throws generic errors, we check the message to determine cause
 */
function getNetworkErrorMessage(error: Error): string {
  if (error.message.includes('Failed to fetch') || error.message.includes('Network request failed')) {
    return 'Network error. Please check your internet connection.';
  }
  return error.message;
}
