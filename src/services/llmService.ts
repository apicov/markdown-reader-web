/**
 * LLM Service
 *
 * Provides translation functionality using external LLM APIs (OpenAI, Groq, etc.)
 * Supports context-aware translation with explanations.
 */

import axios from 'axios';
import {LLM_API_TIMEOUT_MS, LLM_TEMPERATURE, DEFAULT_TARGET_LANGUAGE} from '../constants';

/**
 * Result structure returned by translation service
 */
export interface TranslationResult {
  /** Translated text in target language */
  translation: string;
  /** Explanation or context about the translation */
  explanation: string;
}

/**
 * Translate a word or phrase using an LLM API
 *
 * Makes a request to a compatible chat completion API (OpenAI format) to translate
 * text with contextual understanding and explanation.
 *
 * @param word - The word or phrase to translate
 * @param apiUrl - LLM API endpoint URL (e.g., 'https://api.openai.com/v1/chat/completions')
 * @param apiKey - Authentication key for the API
 * @param model - Model name to use (e.g., 'gpt-4', 'llama-3.3-70b-versatile')
 * @param targetLanguage - Target language for translation (default from constants)
 * @param context - Optional surrounding text to improve translation accuracy
 * @returns Promise resolving to translation result with text and explanation
 * @throws Returns error object (not thrown) with error details in explanation field
 */
export const translateWord = async (
  word: string,
  apiUrl: string,
  apiKey: string,
  model: string = '',
  targetLanguage: string = DEFAULT_TARGET_LANGUAGE,
  context?: string,
): Promise<TranslationResult> => {
  try {
    // Sanitize inputs
    const trimmedUrl = apiUrl?.trim();
    const trimmedKey = apiKey?.trim();
    const trimmedModel = model?.trim();
    const trimmedTargetLanguage = targetLanguage?.trim() || DEFAULT_TARGET_LANGUAGE;

    // Validate required configuration
    if (!trimmedUrl || !trimmedKey || !trimmedModel) {
      throw new Error('LLM API URL, Key, and Model must be configured in settings');
    }

    // Build prompt with or without context
    const prompt = context
      ? `Translate the word "${word}" to ${trimmedTargetLanguage} and provide a brief explanation in ${trimmedTargetLanguage}. Context: "${context}". Format your response as JSON with keys "translation" and "explanation".`
      : `Translate the word "${word}" to ${trimmedTargetLanguage} and provide a brief explanation in ${trimmedTargetLanguage}. Format your response as JSON with keys "translation" and "explanation".`;

    // Make API request using OpenAI-compatible format
    const response = await axios.post(
      trimmedUrl,
      {
        model: trimmedModel,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: LLM_TEMPERATURE,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${trimmedKey}`,
        },
        timeout: LLM_API_TIMEOUT_MS,
      },
    );

    // Parse response and extract translation
    const content = response.data.choices[0].message.content;
    const parsed = JSON.parse(content);

    return {
      translation: parsed.translation || 'Translation not available',
      explanation: parsed.explanation || 'Explanation not available',
    };
  } catch (error: any) {
    // Log error for debugging (but NOT sensitive credentials)
    console.error('Translation error:', error?.message || error);

    const errorMsg = error?.response?.data?.error?.message || error?.message || 'Unknown error';

    // Return user-friendly error without exposing credentials
    return {
      translation: 'Error',
      explanation: `Translation failed: ${errorMsg}. Please check your API settings.`,
    };
  }
};
