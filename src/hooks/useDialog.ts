/**
 * useDialog Hook
 *
 * Reusable custom hook for managing dialog/modal state.
 * Handles common dialog patterns: open/close, form data, loading states, submission.
 *
 * LEARNING NOTES - Custom Hook Benefits:
 * - Reusability: Extract complex logic once, use in multiple components
 * - Separation of concerns: Business logic separate from UI
 * - Testability: Can test logic independently
 * - Type safety: TypeScript generics make it work with any data shape
 *
 * PATTERN: Generic custom hook
 * The <T> makes this hook flexible - it can manage dialogs with different data shapes.
 * Example: useDialog<{ name: string }> vs useDialog<{ email: string, password: string }>
 */

import { useState, useCallback } from 'react';

/**
 * Options for configuring the dialog hook
 *
 * LEARNING NOTE - TypeScript Generics:
 * <T> is a type parameter - like a function parameter but for types
 * It lets the hook work with any data shape while maintaining type safety
 */
interface UseDialogOptions<T> {
  /** Initial state for dialog form data */
  initialData: T;
  /** Optional submit handler - called when form is submitted */
  onSubmit?: (data: T) => Promise<void>;
}

/**
 * Return value from useDialog hook
 *
 * LEARNING NOTE - Complex return types:
 * Hooks can return objects with many properties
 * This is better than returning an array when you have 5+ values
 */
interface UseDialogReturn<T> {
  /** Whether dialog is currently open */
  isOpen: boolean;
  /** Current form data */
  data: T;
  /** Update form data */
  setData: React.Dispatch<React.SetStateAction<T>>;
  /** Whether submission is in progress */
  isLoading: boolean;
  /** Control loading state */
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  /** Open the dialog */
  open: () => void;
  /** Close the dialog */
  close: () => void;
  /** Reset form to initial state */
  reset: () => void;
  /** Submit the form */
  handleSubmit: () => Promise<void>;
}

/**
 * Hook for managing dialog state
 *
 * LEARNING NOTE - Generic function:
 * export function useDialog<T> means T is determined when you call it
 * useDialog<{ name: string }>(...) → T = { name: string }
 *
 * @param options - Configuration options
 * @param options.initialData - Initial state for dialog form data
 * @param options.onSubmit - Optional submit handler
 * @returns Dialog state and control functions
 *
 * @example
 * ```tsx
 * // In a component:
 * const dialog = useDialog({
 *   initialData: { name: '' },
 *   onSubmit: async (data) => {
 *     await createDeck(data.name);
 *   }
 * });
 *
 * // In JSX:
 * <Dialog open={dialog.isOpen} onClose={dialog.close}>
 *   <TextField
 *     value={dialog.data.name}
 *     onChange={(e) => dialog.setData({ name: e.target.value })}
 *   />
 *   <Button onClick={dialog.handleSubmit} disabled={dialog.isLoading}>
 *     Create
 *   </Button>
 * </Dialog>
 * ```
 */
export function useDialog<T>({ initialData, onSubmit }: UseDialogOptions<T>): UseDialogReturn<T> {
  /**
   * Dialog state management
   *
   * PATTERN: Multiple related pieces of state
   * We could use a single state object, but separate states are simpler
   * when each piece updates independently
   */
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<T>(initialData);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Open dialog
   *
   * LEARNING NOTE - useCallback hook:
   * useCallback memoizes (caches) the function so it doesn't get recreated on every render.
   *
   * WHY: If we pass this function as a prop to child components,
   * without useCallback they would re-render unnecessarily when parent renders.
   *
   * SYNTAX: useCallback(() => { code }, [dependencies])
   * - Empty deps [] means the function never changes
   */
  const open = useCallback(() => {
    setIsOpen(true);
  }, []);

  /**
   * Close dialog
   */
  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  /**
   * Reset form to initial state
   *
   * LEARNING NOTE - useCallback with dependencies:
   * [initialData] means: recreate this function if initialData changes
   * This ensures reset() always uses the latest initialData value
   */
  const reset = useCallback(() => {
    setData(initialData);
    setIsLoading(false);
  }, [initialData]);

  /**
   * Handle form submission
   *
   * LEARNING NOTE - Async callbacks:
   * Even though this is wrapped in useCallback, it can still be async
   *
   * PATTERN: Loading state management
   * 1. Set loading = true (disable button, show spinner)
   * 2. Try to submit
   * 3. On success: close dialog and reset
   * 4. On error: keep dialog open, log error
   * 5. Always: set loading = false (in finally block)
   *
   * LEARNING NOTE - finally block:
   * Runs whether try succeeds or catch catches an error
   * Perfect for cleanup (stop loading spinner)
   */
  const handleSubmit = useCallback(async () => {
    if (!onSubmit) return; // Guard: Nothing to do if no submit handler provided

    setIsLoading(true);
    try {
      await onSubmit(data); // Call the submit handler passed in options
      close();               // Success: close dialog
      reset();               // Success: reset form
    } catch (error) {
      console.error('Dialog submit error:', error);
      throw error; // Re-throw so caller can handle it too
    } finally {
      setIsLoading(false); // Always stop loading, even if error occurred
    }
  }, [onSubmit, data, close, reset]); // Dependencies: recreate if any of these change

  return {
    isOpen,
    data,
    setData,
    isLoading,
    setIsLoading,
    open,
    close,
    reset,
    handleSubmit,
  };
}
