/**
 * Notification Service
 *
 * Centralized service for displaying user notifications (errors, success messages, info).
 * Currently uses browser alert, but can be easily extended to use a toast library or snackbar.
 */

/**
 * Display an error notification to the user
 *
 * @param message - Error message to display
 */
export const showError = (message: string): void => {
  alert(`Error: ${message}`);
};

/**
 * Display a success notification to the user
 *
 * @param message - Success message to display
 */
export const showSuccess = (message: string): void => {
  alert(message);
};

/**
 * Display an info notification to the user
 *
 * @param message - Info message to display
 */
export const showInfo = (message: string): void => {
  alert(message);
};

/**
 * Display a confirmation dialog
 *
 * @param message - Confirmation message
 * @returns True if user confirmed, false otherwise
 */
export const confirm = (message: string): boolean => {
  return window.confirm(message);
};
