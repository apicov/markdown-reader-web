/**
 * User-facing messages for the application
 */

export const MESSAGES = {
  ERRORS: {
    NO_MARKDOWN_IN_FOLDER: 'No markdown file found in this folder',
    BROWSER_NOT_SUPPORTED: 'File System Access API is not supported in this browser. Please use Chrome or Edge.',
    FOLDER_SELECTION_FAILED: 'Folder selection was cancelled or failed.',
    NO_DOCUMENTS_FOUND: 'No document folders found. Make sure your folder contains subdirectories with .md files.',
    FOLDER_ACCESS_FAILED: (error: string) => `Failed to access folder: ${error}`,
  },
} as const;
