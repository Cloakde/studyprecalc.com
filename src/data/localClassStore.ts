import { useCallback, useEffect, useState } from 'react';

import type { PublicAccount } from './localAccountStore';
import {
  createClassEnrollment,
  createClassRecord,
  isClassEnrollmentRole,
  sortClasses,
  upsertClassEnrollment,
  type ClassEnrollment,
  type ClassRecord,
} from '../domain/classes';

export const localClassStorageKey = 'precalcapp.classes.v1';
export const classStoreVersion = 'precalcapp.classes.v1';

export type ClassStorage = Pick<Storage, 'getItem' | 'removeItem' | 'setItem'>;

export type ClassPayload = {
  version: typeof classStoreVersion;
  classes: ClassRecord[];
  enrollments: ClassEnrollment[];
};

function getBrowserStorage(): ClassStorage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage;
}

function createBrowserId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function hasValue(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isClassRecord(candidate: unknown): candidate is ClassRecord {
  if (typeof candidate !== 'object' || candidate === null) {
    return false;
  }

  const classRecord = candidate as Partial<ClassRecord>;

  return (
    hasValue(classRecord.id) &&
    hasValue(classRecord.name) &&
    hasValue(classRecord.createdAt) &&
    hasValue(classRecord.updatedAt) &&
    (classRecord.description === undefined || typeof classRecord.description === 'string') &&
    (classRecord.createdBy === undefined || typeof classRecord.createdBy === 'string') &&
    (classRecord.archivedAt === undefined || typeof classRecord.archivedAt === 'string')
  );
}

function isClassEnrollment(candidate: unknown): candidate is ClassEnrollment {
  if (typeof candidate !== 'object' || candidate === null) {
    return false;
  }

  const enrollment = candidate as Partial<ClassEnrollment>;

  return (
    hasValue(enrollment.id) &&
    hasValue(enrollment.classId) &&
    hasValue(enrollment.accountId) &&
    hasValue(enrollment.email) &&
    hasValue(enrollment.displayName) &&
    isClassEnrollmentRole(enrollment.role) &&
    hasValue(enrollment.createdAt)
  );
}

function normalizeClassRecord(classRecord: ClassRecord): ClassRecord {
  return createClassRecord(classRecord);
}

function normalizeEnrollment(enrollment: ClassEnrollment): ClassEnrollment {
  return createClassEnrollment(enrollment);
}

function normalizeEnrollments(enrollments: ClassEnrollment[]): ClassEnrollment[] {
  return enrollments.reduce<ClassEnrollment[]>(
    (normalizedEnrollments, enrollment) =>
      upsertClassEnrollment(normalizedEnrollments, normalizeEnrollment(enrollment)),
    [],
  );
}

function createEmptyPayload(): ClassPayload {
  return {
    version: classStoreVersion,
    classes: [],
    enrollments: [],
  };
}

export function loadClassPayload(
  storage: ClassStorage | null = getBrowserStorage(),
  storageKey = localClassStorageKey,
): ClassPayload {
  if (!storage) {
    return createEmptyPayload();
  }

  const raw = storage.getItem(storageKey);

  if (!raw) {
    return createEmptyPayload();
  }

  try {
    const parsed = JSON.parse(raw) as Partial<ClassPayload>;

    return {
      version: classStoreVersion,
      classes: Array.isArray(parsed.classes)
        ? sortClasses(parsed.classes.filter(isClassRecord).map(normalizeClassRecord))
        : [],
      enrollments: Array.isArray(parsed.enrollments)
        ? normalizeEnrollments(parsed.enrollments.filter(isClassEnrollment))
        : [],
    };
  } catch {
    return createEmptyPayload();
  }
}

export function saveClassPayload(
  payload: ClassPayload,
  storage: ClassStorage | null = getBrowserStorage(),
  storageKey = localClassStorageKey,
): ClassPayload {
  const normalizedPayload: ClassPayload = {
    version: classStoreVersion,
    classes: sortClasses(payload.classes.map(normalizeClassRecord)),
    enrollments: normalizeEnrollments(payload.enrollments),
  };

  if (storage) {
    storage.setItem(storageKey, JSON.stringify(normalizedPayload, null, 2));
  }

  return normalizedPayload;
}

export function createLocalClass(
  input: {
    name: string;
    description?: string;
    createdBy?: string;
  },
  options: {
    storage?: ClassStorage | null;
    storageKey?: string;
    now?: () => Date;
    createId?: () => string;
  } = {},
): { classRecord: ClassRecord; payload: ClassPayload } {
  const storage = options.storage === undefined ? getBrowserStorage() : options.storage;
  const storageKey = options.storageKey ?? localClassStorageKey;
  const now = options.now ?? (() => new Date());
  const createId = options.createId ?? (() => createBrowserId('class'));
  const payload = loadClassPayload(storage, storageKey);
  const createdAt = now();
  const classRecord = createClassRecord({
    id: createId(),
    name: input.name,
    createdAt,
    updatedAt: createdAt,
    ...(input.description ? { description: input.description } : {}),
    ...(input.createdBy ? { createdBy: input.createdBy } : {}),
  });

  const nextPayload = saveClassPayload(
    {
      ...payload,
      classes: [...payload.classes, classRecord],
    },
    storage,
    storageKey,
  );

  return {
    classRecord,
    payload: nextPayload,
  };
}

export function enrollLocalAccountInClass(
  classId: string,
  account: PublicAccount,
  options: {
    storage?: ClassStorage | null;
    storageKey?: string;
    now?: () => Date;
    createId?: () => string;
  } = {},
): { enrollment: ClassEnrollment | null; payload: ClassPayload } {
  const storage = options.storage === undefined ? getBrowserStorage() : options.storage;
  const storageKey = options.storageKey ?? localClassStorageKey;
  const normalizedClassId = classId.trim();
  const payload = loadClassPayload(storage, storageKey);

  if (!payload.classes.some((classRecord) => classRecord.id === normalizedClassId)) {
    return {
      enrollment: null,
      payload,
    };
  }

  const existingEnrollment = payload.enrollments.find(
    (enrollment) => enrollment.classId === normalizedClassId && enrollment.accountId === account.id,
  );

  if (existingEnrollment) {
    const updatedEnrollment = createClassEnrollment({
      ...existingEnrollment,
      email: account.email,
      displayName: account.displayName,
      role: account.role,
    });
    const nextPayload = saveClassPayload(
      {
        ...payload,
        enrollments: upsertClassEnrollment(payload.enrollments, updatedEnrollment),
      },
      storage,
      storageKey,
    );

    return {
      enrollment:
        nextPayload.enrollments.find(
          (enrollment) =>
            enrollment.classId === normalizedClassId && enrollment.accountId === account.id,
        ) ?? updatedEnrollment,
      payload: nextPayload,
    };
  }

  const enrollment = createClassEnrollment({
    id: (options.createId ?? (() => createBrowserId('enrollment')))(),
    classId: normalizedClassId,
    accountId: account.id,
    email: account.email,
    displayName: account.displayName,
    role: account.role,
    createdAt: (options.now ?? (() => new Date()))(),
  });
  const nextPayload = saveClassPayload(
    {
      ...payload,
      enrollments: upsertClassEnrollment(payload.enrollments, enrollment),
    },
    storage,
    storageKey,
  );

  return {
    enrollment,
    payload: nextPayload,
  };
}

export function useLocalClassStore(
  options: {
    storage?: ClassStorage | null;
    storageKey?: string;
  } = {},
) {
  const storage = options.storage === undefined ? getBrowserStorage() : options.storage;
  const storageKey = options.storageKey ?? localClassStorageKey;
  const [payload, setPayload] = useState(() => loadClassPayload(storage, storageKey));

  const createClass = useCallback(
    (input: { name: string; description?: string; createdBy?: string }) => {
      const result = createLocalClass(input, { storage, storageKey });
      setPayload(result.payload);
      return result.classRecord;
    },
    [storage, storageKey],
  );

  const enrollAccount = useCallback(
    (classId: string, account: PublicAccount) => {
      const result = enrollLocalAccountInClass(classId, account, { storage, storageKey });
      setPayload(result.payload);
      return result.enrollment;
    },
    [storage, storageKey],
  );

  const refreshClasses = useCallback(() => {
    setPayload(loadClassPayload(storage, storageKey));
  }, [storage, storageKey]);

  useEffect(() => {
    setPayload(loadClassPayload(storage, storageKey));
  }, [storage, storageKey]);

  return {
    classes: payload.classes,
    enrollments: payload.enrollments,
    createClass,
    enrollAccount,
    refreshClasses,
  };
}
