import type { DocumentProviderPlugin } from './documentProvider';

export class DocumentProviderWeb implements DocumentProviderPlugin {
  async takePersistableUriPermission(): Promise<void> {
    // Not needed on web
  }

  async listDirectory(): Promise<{ files: any[] }> {
    throw new Error('Not implemented on web');
  }

  async readFile(): Promise<{ content: string }> {
    throw new Error('Not implemented on web');
  }
}
