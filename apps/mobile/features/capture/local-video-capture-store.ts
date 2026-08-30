import {
  validateCapture,
  type CaptureRequest,
  type PolicyOutcome,
} from '../../../../packages/domain/src/policy';
import type {
  AuditRepositoryPort,
  ContributionRepositoryPort,
  CycleRepositoryPort,
  GroupRepositoryPort,
  SessionRepositoryPort,
} from '../../../../packages/domain/src/ports';
import type {
  Contribution,
  IsoTimestamp,
  VignetteTreatment,
} from '../../../../packages/domain/src/models';

import { DEMO_GROUP_ID } from '../session/session';
import type { LocalMediaFilePort } from '../../platform/files/storage';

export interface LocalVideoCaptureInput {
  readonly capturedAt: IsoTimestamp;
  readonly durationSeconds: number;
  readonly sourceUri: string;
  readonly vignetteTreatment: VignetteTreatment;
}

export interface LocalVideoCaptureStore {
  discard(sourceUri: string): Promise<void>;
  save(input: LocalVideoCaptureInput): Promise<PolicyOutcome<Contribution>>;
}

export interface LocalVideoCaptureRepository {
  readonly audit: Pick<AuditRepositoryPort, 'append'>;
  readonly contributions: Pick<ContributionRepositoryPort, 'listByCycle' | 'save'>;
  readonly cycles: Pick<CycleRepositoryPort, 'getCollecting'>;
  readonly groups: Pick<GroupRepositoryPort, 'get'>;
  readonly session: Pick<SessionRepositoryPort, 'getActiveMemberId'>;
}

export interface LocalVideoCaptureStoreOptions {
  readonly files: LocalMediaFilePort;
  readonly nextId?: () => string;
  readonly repository: LocalVideoCaptureRepository;
}

export function createLocalVideoCaptureStore({
  files,
  nextId,
  repository,
}: LocalVideoCaptureStoreOptions): LocalVideoCaptureStore {
  let sequence = 0;
  const createId = nextId ?? (() => `contribution-video-${Date.now().toString(36)}-${++sequence}`);

  return {
    discard: (sourceUri) => files.remove(sourceUri),
    async save(input) {
      const group = await repository.groups.get(DEMO_GROUP_ID);
      const cycle = group
        ? await repository.cycles.getCollecting(group.id, input.capturedAt)
        : null;
      const memberId = group ? await repository.session.getActiveMemberId(group.id) : null;

      if (!group || !cycle || !memberId) {
        throw new Error('The local capture context could not be restored');
      }

      const existingContributions = await repository.contributions.listByCycle(cycle.id);
      const request = createCaptureRequest(input, memberId, cycle.id, createId());
      const outcome = validateCapture({
        context: {
          at: input.capturedAt,
          auditEventId: `capture-video-${request.id}`,
        },
        cycle,
        existingContributions,
        group,
        request,
      });

      if (!outcome.accepted) {
        return outcome;
      }

      let copiedUri: string | null = null;
      try {
        const copiedFile = await files.copyFromCache(
          input.sourceUri,
          `${request.id}.${videoExtension(input.sourceUri)}`,
        );
        copiedUri = copiedFile.uri;
        if (!(await files.exists(copiedUri))) {
          throw new Error('The local capture file was not copied durably');
        }
        const contribution = { ...outcome.value, localUri: copiedFile.uri };
        await repository.contributions.save(contribution);
        await repository.audit.append(outcome.auditEvent);
        return { ...outcome, value: contribution };
      } catch (error) {
        if (copiedUri) {
          await files.remove(copiedUri).catch(() => undefined);
        }
        throw error;
      }
    },
  };
}

export async function createSqliteLocalVideoCaptureStore(
  providedFiles?: LocalMediaFilePort,
): Promise<LocalVideoCaptureStore> {
  const files =
    providedFiles ??
    (await import('../../platform/files/expo-file-storage')).createExpoLocalMediaFilePort();
  const { openLocalDatabase } = await import('../../data/local/database');
  const database = await openLocalDatabase();
  return createLocalVideoCaptureStore({ files, repository: database.repository });
}

function createCaptureRequest(
  input: LocalVideoCaptureInput,
  memberId: string,
  cycleId: string,
  id: string,
): CaptureRequest {
  return {
    capturedAt: input.capturedAt,
    cycleId,
    durationSeconds: input.durationSeconds,
    id,
    localUri: null,
    mediaKind: 'video',
    memberId,
    vignetteTreatment: input.vignetteTreatment,
  };
}

function videoExtension(sourceUri: string): 'mp4' | 'mov' | 'm4v' {
  const extension = sourceUri
    .split(/[?#]/, 1)[0]
    ?.match(/\.([a-z0-9]+)$/i)?.[1]
    ?.toLowerCase();
  return extension === 'mov' || extension === 'm4v' ? extension : 'mp4';
}
