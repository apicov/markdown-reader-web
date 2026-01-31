/**
 * useDialog Hook
 *
 * Reusable hook for managing dialog state (open/close, form data, loading states).
 * Reduces duplication in components that use dialogs.
 */

import { useState, useCallback } from 'react';

interface UseDialogOptions<T> {
  initialData: T;
  onSubmit?: (data: T) => Promise<void>;
}

interface UseDialogReturn<T> {
  isOpen: boolean;
  data: T;
  setData: React.Dispatch<React.SetStateAction<T>>;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  open: () => void;
  close: () => void;
  reset: () => void;
  handleSubmit: () => Promise<void>;
}

/**
 * Hook for managing dialog state
 *
 * @param options - Configuration options
 * @param options.initialData - Initial state for dialog form data
 * @param options.onSubmit - Optional submit handler
 * @returns Dialog state and control functions
 *
 * @example
 * ```tsx
 * const dialog = useDialog({
 *   initialData: { name: '' },
 *   onSubmit: async (data) => {
 *     await createDeck(data.name);
 *   }
 * });
 *
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
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<T>(initialData);
  const [isLoading, setIsLoading] = useState(false);

  const open = useCallback(() => {
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const reset = useCallback(() => {
    setData(initialData);
    setIsLoading(false);
  }, [initialData]);

  const handleSubmit = useCallback(async () => {
    if (!onSubmit) return;

    setIsLoading(true);
    try {
      await onSubmit(data);
      close();
      reset();
    } catch (error) {
      console.error('Dialog submit error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [onSubmit, data, close, reset]);

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
