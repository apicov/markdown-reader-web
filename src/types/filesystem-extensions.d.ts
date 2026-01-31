/**
 * TypeScript extensions for File System Access API
 *
 * Augments the built-in FileSystemDirectoryHandle type to include
 * the values() async iterator method and showDirectoryPicker on Window,
 * which are part of the File System Access API but missing from lib.dom.d.ts
 */

// Augment the existing FileSystemDirectoryHandle interface
declare global {
  interface FileSystemDirectoryHandle {
    values(): AsyncIterableIterator<FileSystemHandle>;
    [Symbol.asyncIterator](): AsyncIterableIterator<[string, FileSystemHandle]>;
  }

  interface ShowDirectoryPickerOptions {
    mode?: 'read' | 'readwrite';
    startIn?: 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos';
  }

  interface Window {
    showDirectoryPicker(options?: ShowDirectoryPickerOptions): Promise<FileSystemDirectoryHandle>;
  }
}

export {};
