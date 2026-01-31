import { registerPlugin } from '@capacitor/core';

export interface DocumentProviderPlugin {
  takePersistableUriPermission(options: { uri: string }): Promise<void>;
  listDirectory(options: { uri: string }): Promise<{ files: DocumentFile[] }>;
  readFile(options: { uri: string }): Promise<{ content: string }>;
}

export interface DocumentFile {
  name: string;
  uri: string;
  isDirectory: boolean;
  type: 'directory' | 'file';
  mimeType: string | null;
}

const DocumentProvider = registerPlugin<DocumentProviderPlugin>('DocumentProvider', {
  web: () => import('./documentProviderWeb').then(m => new m.DocumentProviderWeb()),
});

export default DocumentProvider;
