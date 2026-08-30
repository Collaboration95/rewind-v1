import type {
  Contribution,
  IsoTimestamp,
  VignetteTreatment,
} from '../../../../packages/domain/src/models';
import type { PolicyOutcome } from '../../../../packages/domain/src/policy';

import {
  createLocalMediaCaptureStore,
  createSqliteLocalMediaCaptureStore,
  type LocalMediaCaptureRepository,
} from './local-media-capture-store';
import type { LocalMediaFilePort } from '../../platform/files/storage';

export interface LocalPhotoCaptureInput {
  readonly capturedAt: IsoTimestamp;
  readonly durationSeconds: number;
  readonly sourceUri: string;
  readonly vignetteTreatment: VignetteTreatment;
}

export interface LocalPhotoCaptureStore {
  discard(sourceUri: string): Promise<void>;
  save(input: LocalPhotoCaptureInput): Promise<PolicyOutcome<Contribution>>;
}

export type LocalPhotoCaptureRepository = LocalMediaCaptureRepository;

export interface LocalPhotoCaptureStoreOptions {
  readonly files: LocalMediaFilePort;
  readonly nextId?: () => string;
  readonly repository: LocalPhotoCaptureRepository;
}

export function createLocalPhotoCaptureStore({
  files,
  nextId,
  repository,
}: LocalPhotoCaptureStoreOptions): LocalPhotoCaptureStore {
  const store = createLocalMediaCaptureStore({
    files,
    filePrefix: 'contribution-photo',
    mediaKind: 'photo',
    nextId,
    repository,
  });

  return {
    discard: store.discard,
    save: (input) => store.save({ ...input, mediaKind: 'photo' }),
  };
}

export async function createSqliteLocalPhotoCaptureStore(
  providedFiles?: LocalMediaFilePort,
): Promise<LocalPhotoCaptureStore> {
  const store = await createSqliteLocalMediaCaptureStore('photo', providedFiles);
  return {
    discard: store.discard,
    save: (input) => store.save({ ...input, mediaKind: 'photo' }),
  };
}
