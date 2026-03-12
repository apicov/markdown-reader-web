/**
 * Document Provider Plugin
 *
 * Capacitor plugin for accessing files and directories on mobile devices.
 * This bridges JavaScript with native Android/iOS file APIs.
 *
 * LEARNING NOTES - Capacitor Plugins:
 * Capacitor plugins allow JavaScript to call native device APIs.
 * Structure:
 * 1. Define TypeScript interface (what methods are available)
 * 2. Register plugin with native implementation name
 * 3. Provide web fallback for browser testing
 *
 * LEARNING NOTES - Platform-specific code:
 * - On Android/iOS: Uses native DocumentProvider implementation (written in Java/Swift)
 * - On Web: Uses documentProviderWeb.ts (browser file access simulation)
 *
 * This is a KEY concept in Capacitor - write once, run everywhere!
 */

import { registerPlugin } from '@capacitor/core';

/**
 * Plugin interface defining available methods
 *
 * LEARNING NOTE - Plugin interface:
 * This defines the "contract" between JavaScript and native code.
 * Native platform implementations must provide these exact methods.
 */
export interface DocumentProviderPlugin {
  /**
   * Request persistent access to a directory URI
   * Required on Android to maintain access across app restarts
   *
   * CAPACITOR CONCEPT: Android requires explicit permission to access user-selected folders
   */
  takePersistableUriPermission(options: { uri: string }): Promise<void>;

  /**
   * List all files in a directory
   *
   * @param options.uri - Directory URI (from Android file picker)
   * @returns Array of files and subdirectories
   */
  listDirectory(options: { uri: string }): Promise<{ files: DocumentFile[] }>;

  /**
   * Read file contents
   *
   * @param options.uri - File URI
   * @param options.asBase64 - If true, read as binary and return base64-encoded
   * @returns File contents as string (text or base64)
   */
  readFile(options: { uri: string; asBase64?: boolean }): Promise<{ content: string }>;
}

/**
 * File/directory metadata
 *
 * LEARNING NOTE - TypeScript interface for data shape:
 * Defines what information we get about each file
 */
export interface DocumentFile {
  /** File or directory name */
  name: string;
  /** Platform-specific URI (e.g., content://... on Android) */
  uri: string;
  /** Whether this is a directory */
  isDirectory: boolean;
  /** Type discriminator for TypeScript */
  type: 'directory' | 'file';
  /** MIME type (e.g., 'text/markdown', null for directories) */
  mimeType: string | null;
}

/**
 * Register the plugin
 *
 * LEARNING NOTE - registerPlugin:
 * Tells Capacitor to connect JavaScript calls to native implementations.
 *
 * PARAMETERS:
 * 1. 'DocumentProvider' - Name of native plugin (must match native code)
 * 2. Configuration object with platform fallbacks
 *
 * PATTERN: Web fallback for development
 * The 'web' property provides a browser implementation for testing
 * without deploying to mobile devices. Uses dynamic import for code splitting.
 */
const DocumentProvider = registerPlugin<DocumentProviderPlugin>('DocumentProvider', {
  web: () => import('./documentProviderWeb').then(m => new m.DocumentProviderWeb()),
});

export default DocumentProvider;
