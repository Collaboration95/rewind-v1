import { Directory, File, Paths } from 'expo-file-system';

import type { LocalMediaFile, LocalMediaFilePort } from './storage';

const CAPTURE_DIRECTORY = 'rewind-captures';

function assertSafeFileName(fileName: string): void {
  if (!/^[a-zA-Z0-9._-]+$/.test(fileName)) {
    throw new Error('The local capture file name is invalid');
  }
}

function captureDirectory(): Directory {
  const directory = new Directory(Paths.document, CAPTURE_DIRECTORY);
  directory.create({ idempotent: true, intermediates: true });
  return directory;
}

export function createExpoLocalMediaFilePort(): LocalMediaFilePort {
  return {
    async copyFromCache(sourceUri, destinationName): Promise<LocalMediaFile> {
      assertSafeFileName(destinationName);
      const destination = new File(captureDirectory(), destinationName);
      await new File(sourceUri).copy(destination, { overwrite: true });
      return { uri: destination.uri };
    },
    async exists(localUri) {
      return new File(localUri).exists;
    },
    async remove(localUri) {
      const file = new File(localUri);
      if (file.exists) {
        file.delete();
      }
    },
  };
}
