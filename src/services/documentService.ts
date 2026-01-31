/**
 * Document Service
 *
 * Handles file system operations for document management.
 * Uses Capacitor Filesystem API for mobile and File System Access API for web.
 */

import { Filesystem, Directory as FilesystemDirectory, Encoding } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import type { Document } from '../types';
import DocumentProvider from '../plugins/documentProvider';

/**
 * Retrieve list of document folders from a directory
 *
 * For web: Uses File System Access API (user must grant permission)
 * For mobile: Uses Capacitor Filesystem API
 *
 * @param docsPath - Path to the documents directory
 * @returns Array of Document objects representing folders
 */
export const getDocuments = async (docsPath: string): Promise<Document[]> => {
  try {
    const platform = Capacitor.getPlatform();

    if (platform === 'web') {
      // Web: Use File System Access API with directory handle
      return await getWebDocuments();
    } else {
      console.log('[getDocuments] Mobile - docsPath:', docsPath, 'mobileContentUri:', mobileContentUri);

      // Mobile: Check if we have a content URI
      if (mobileContentUri) {
        console.log('[getDocuments] Using content URI:', mobileContentUri);
        return await getMobileDocumentsFromContentUri();
      }

      // Fallback: Use Capacitor Filesystem with regular path
      if (!docsPath || docsPath.trim() === '') {
        console.log('[getDocuments] No docsPath and no mobileContentUri, returning empty');
        return [];
      }

      // Check if path is absolute (starts with /)
      const isAbsolutePath = docsPath.startsWith('/');

      console.log('[getDocuments] Reading path:', docsPath, 'isAbsolute:', isAbsolutePath);

      const result = await Filesystem.readdir({
        path: docsPath,
        // Use absolute path if provided (from FilePicker), otherwise use ExternalStorage
        ...(isAbsolutePath ? {} : { directory: FilesystemDirectory.ExternalStorage }),
      });

      console.log('[getDocuments] Found files:', result.files.length);
      console.log('[getDocuments] Files:', JSON.stringify(result.files, null, 2));

      const documents: Document[] = [];

      for (const file of result.files) {
        if (file.type === 'directory') {
          const fullPath = `${docsPath}/${file.name}`;
          console.log('[getDocuments] Found book folder:', file.name, 'at', fullPath);
          documents.push({
            id: file.name,
            title: file.name,
            folderPath: fullPath,
            markdownFile: '',
          });
        }
      }

      console.log('[getDocuments] Total documents found:', documents.length);
      return documents;
    }
  } catch (error) {
    console.error('Failed to get documents:', error);
    return [];
  }
};

/**
 * Find the first markdown file in a folder
 *
 * @param folderPath - Path of the folder to search
 * @returns Path of the markdown file, or null if none found
 */
export const findMarkdownInFolder = async (
  folderPath: string,
): Promise<string | null> => {
  try {
    const platform = Capacitor.getPlatform();

    if (platform === 'web') {
      // Web: Use cached file map
      return await findMarkdownInWebFolder(folderPath);
    } else {
      // Mobile: Check if this is a content URI
      if (folderPath.startsWith('content://')) {
        const result = await DocumentProvider.listDirectory({ uri: folderPath });

        for (const file of result.files) {
          if (!file.isDirectory && file.name.toLowerCase().endsWith('.md')) {
            return file.uri;
          }
        }

        return null;
      }

      // Check if path is absolute (starts with /)
      const isAbsolutePath = folderPath.startsWith('/');

      const result = await Filesystem.readdir({
        path: folderPath,
        // Use absolute path if provided (from FilePicker), otherwise use ExternalStorage
        ...(isAbsolutePath ? {} : { directory: FilesystemDirectory.ExternalStorage }),
      });

      for (const file of result.files) {
        if (file.type === 'file' && file.name.toLowerCase().endsWith('.md')) {
          return `${folderPath}/${file.name}`;
        }
      }

      return null;
    }
  } catch (error) {
    console.error('Failed to find markdown in folder:', error);
    return null;
  }
};

/**
 * Read the content of a markdown file
 *
 * @param filePath - Path of the markdown file to read
 * @returns File content as string, empty string on error
 */
export const readMarkdownFile = async (filePath: string): Promise<string> => {
  try {
    const platform = Capacitor.getPlatform();

    if (platform === 'web') {
      // Web: Use cached files
      return await readWebMarkdownFile(filePath);
    } else {
      // Mobile: Check if this is a content URI
      if (filePath.startsWith('content://')) {
        const result = await DocumentProvider.readFile({ uri: filePath });
        return result.content;
      }

      // Check if path is absolute (starts with /)
      const isAbsolutePath = filePath.startsWith('/');

      const result = await Filesystem.readFile({
        path: filePath,
        // Use absolute path if provided (from FilePicker), otherwise use ExternalStorage
        ...(isAbsolutePath ? {} : { directory: FilesystemDirectory.ExternalStorage }),
        encoding: Encoding.UTF8,
      });

      return result.data as string;
    }
  } catch (error) {
    console.error('Failed to read markdown file:', error);
    return '';
  }
};

/**
 * For web platform: Store directory handle and file cache
 */
let webDirectoryHandle: FileSystemDirectoryHandle | null = null;
let webFileCache: Map<string, File> = new Map();

/**
 * For mobile platform: Store content URI from directory picker
 */
let mobileContentUri: string | null = null;

/**
 * Request directory access on web platform using File System Access API
 *
 * @returns DirectoryHandle if successful, null otherwise
 */
export const requestDirectoryAccess = async (contentUri?: string): Promise<FileSystemDirectoryHandle | boolean | null> => {
  const platform = Capacitor.getPlatform();

  if (platform !== 'web') {
    // Mobile: Store the content URI and take persistable permissions
    if (contentUri) {
      console.log('[requestDirectoryAccess] Storing content URI:', contentUri);

      // Take persistable URI permission for long-term access
      try {
        await DocumentProvider.takePersistableUriPermission({ uri: contentUri });
        console.log('[requestDirectoryAccess] Persistable URI permission granted');
      } catch (error) {
        console.error('[requestDirectoryAccess] Failed to take persistable URI permission:', error);
        console.error('[requestDirectoryAccess] Error details:', JSON.stringify(error, null, 2));
        // Continue anyway, it might still work
      }

      mobileContentUri = contentUri;
      return true;
    }
    return true;
  }

  try {
    if ('showDirectoryPicker' in window) {
      webDirectoryHandle = await window.showDirectoryPicker({
        mode: 'read',
      });

      // Load all markdown files into cache
      await loadWebFileCache();

      return webDirectoryHandle;
    } else {
      console.error('File System Access API not supported');
      return null;
    }
  } catch (error) {
    console.error('Directory access denied:', error);
    return null;
  }
};

/**
 * Load all markdown files from the web directory into cache
 */
async function loadWebFileCache(): Promise<void> {
  if (!webDirectoryHandle) return;

  webFileCache.clear();

  try {
    for await (const entry of webDirectoryHandle.values()) {
      if (entry.kind === 'directory') {
        // Recursively load files from subdirectory
        await loadFilesFromDirectory(entry as FileSystemDirectoryHandle, entry.name);
      }
    }
  } catch (error) {
    console.error('Failed to load file cache:', error);
  }
}

/**
 * Recursively load markdown and image files from a directory
 */
async function loadFilesFromDirectory(dirHandle: FileSystemDirectoryHandle, path: string): Promise<void> {
  try {
    for await (const entry of dirHandle.values()) {
      if (entry.kind === 'file') {
        const fileHandle = entry as FileSystemFileHandle;
        const file = await fileHandle.getFile();
        // Cache markdown files
        if (entry.name.toLowerCase().endsWith('.md')) {
          webFileCache.set(`${path}/${entry.name}`, file);
        }
        // Cache image files
        else if (file.type.startsWith('image/')) {
          webFileCache.set(`${path}/${entry.name}`, file);
        }
      }
    }
  } catch (error) {
    console.error(`Failed to load files from ${path}:`, error);
  }
}

/**
 * Get documents from web directory handle
 */
export async function getWebDocuments(): Promise<Document[]> {
  if (!webDirectoryHandle) {
    return [];
  }

  const documents: Document[] = [];

  try {
    for await (const entry of webDirectoryHandle.values()) {
      if (entry.kind === 'directory') {
        documents.push({
          id: entry.name,
          title: entry.name,
          folderPath: entry.name,
          markdownFile: '',
        });
      }
    }
  } catch (error) {
    console.error('Failed to read web directory:', error);
  }

  return documents;
}

/**
 * Get documents from mobile content URI using DocumentProvider plugin
 */
async function getMobileDocumentsFromContentUri(): Promise<Document[]> {
  if (!mobileContentUri) {
    return [];
  }

  try {
    const result = await DocumentProvider.listDirectory({ uri: mobileContentUri });
    const documents: Document[] = [];

    for (const file of result.files) {
      if (file.isDirectory) {
        documents.push({
          id: file.name,
          title: file.name,
          folderPath: file.uri, // Store the content URI
          markdownFile: '',
        });
      }
    }

    return documents;
  } catch (error) {
    console.error('Failed to list mobile directory:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    return [];
  }
}

/**
 * Find markdown file in web folder
 */
export async function findMarkdownInWebFolder(folderPath: string): Promise<string | null> {
  const cacheEntries = Array.from(webFileCache.keys());
  const folderFiles = cacheEntries.filter(key =>
    key.startsWith(folderPath + '/') && key.toLowerCase().endsWith('.md')
  );

  if (folderFiles.length > 0) {
    return folderFiles[0];
  }

  return null;
}

/**
 * Read markdown file from web cache
 */
export async function readWebMarkdownFile(filePath: string): Promise<string> {
  const file = webFileCache.get(filePath);

  if (!file) {
    console.error('File not found in cache:', filePath);
    return 'ERROR: File not found in cache';
  }

  try {
    const text = await file.text();
    return text;
  } catch (error) {
    console.error('Failed to read file:', error);
    return 'ERROR: Failed to read file';
  }
}

/**
 * Check if web directory access is granted
 */
export const hasWebDirectoryAccess = (): boolean => {
  return webDirectoryHandle !== null;
};

/**
 * Check if mobile directory access is granted
 */
export const hasMobileDirectoryAccess = (): boolean => {
  return mobileContentUri !== null;
};

/**
 * Get image file from web cache
 */
export const getWebImage = async (folderPath: string, imagePath: string): Promise<string | null> => {
  // Clean up the image path
  const cleanImagePath = imagePath.replace(/^\.?\//, ''); // Remove leading ./ or /

  // Try different path combinations
  const possiblePaths = [
    `${folderPath}/${cleanImagePath}`,
    cleanImagePath,
  ];

  for (const path of possiblePaths) {
    const file = webFileCache.get(path);
    if (file && file.type.startsWith('image/')) {
      // Convert File to data URL
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      });
    }
  }

  return null;
};

