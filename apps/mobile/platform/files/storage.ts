export interface LocalMediaFile {
  readonly uri: string;
}

export interface LocalMediaFilePort {
  copyFromCache(sourceUri: string, destinationName: string): Promise<LocalMediaFile>;
  exists(localUri: string): Promise<boolean>;
  remove(localUri: string): Promise<void>;
}
