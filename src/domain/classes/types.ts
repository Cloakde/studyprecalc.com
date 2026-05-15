export type ClassTimestamp = string | Date;

export type ClassEnrollmentRole = 'student' | 'admin';

export type ClassRecord = {
  id: string;
  name: string;
  description?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
};

export type ClassEnrollment = {
  id: string;
  classId: string;
  accountId: string;
  email: string;
  displayName: string;
  role: ClassEnrollmentRole;
  createdAt: string;
};

export type ClassProgressReadiness = {
  enrolledStudents: number;
  status: 'not-ready' | 'ready';
  message: string;
};

export type CreateClassRecordInput = {
  id: string;
  name: string;
  description?: string;
  createdBy?: string;
  archivedAt?: ClassTimestamp;
  createdAt: ClassTimestamp;
  updatedAt?: ClassTimestamp;
};

export type CreateClassEnrollmentInput = {
  id: string;
  classId: string;
  accountId: string;
  email: string;
  displayName: string;
  role?: ClassEnrollmentRole;
  createdAt: ClassTimestamp;
};

function toTimestamp(value: ClassTimestamp): string {
  return value instanceof Date ? value.toISOString() : value;
}

function trimOptional(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function isClassEnrollmentRole(value: unknown): value is ClassEnrollmentRole {
  return value === 'student' || value === 'admin';
}

export function createClassRecord(input: CreateClassRecordInput): ClassRecord {
  const id = input.id.trim();
  const name = input.name.trim();

  if (!id) {
    throw new Error('Class records must include an id.');
  }

  if (!name) {
    throw new Error('Enter a class name.');
  }

  return {
    id,
    name,
    createdAt: toTimestamp(input.createdAt),
    updatedAt: toTimestamp(input.updatedAt ?? input.createdAt),
    ...(trimOptional(input.description) ? { description: trimOptional(input.description) } : {}),
    ...(trimOptional(input.createdBy) ? { createdBy: trimOptional(input.createdBy) } : {}),
    ...(input.archivedAt ? { archivedAt: toTimestamp(input.archivedAt) } : {}),
  };
}

export function createClassEnrollment(input: CreateClassEnrollmentInput): ClassEnrollment {
  const id = input.id.trim();
  const classId = input.classId.trim();
  const accountId = input.accountId.trim();
  const email = input.email.trim().toLowerCase();
  const displayName = input.displayName.trim();
  const role = input.role ?? 'student';

  if (!id) {
    throw new Error('Class enrollments must include an id.');
  }

  if (!classId) {
    throw new Error('Class enrollments must include a class id.');
  }

  if (!accountId) {
    throw new Error('Class enrollments must include an account id.');
  }

  if (!email) {
    throw new Error('Class enrollments must include an email.');
  }

  if (!displayName) {
    throw new Error('Class enrollments must include a display name.');
  }

  if (!isClassEnrollmentRole(role)) {
    throw new Error('Class enrollments must use a valid role.');
  }

  return {
    id,
    classId,
    accountId,
    email,
    displayName,
    role,
    createdAt: toTimestamp(input.createdAt),
  };
}

export function sortClasses(classes: ClassRecord[]): ClassRecord[] {
  return [...classes].sort((a, b) => {
    const nameComparison = a.name.localeCompare(b.name);

    if (nameComparison !== 0) {
      return nameComparison;
    }

    return a.id.localeCompare(b.id);
  });
}

export function getClassEnrollmentCount(enrollments: ClassEnrollment[], classId: string): number {
  return enrollments.filter((enrollment) => enrollment.classId === classId).length;
}

export function getClassProgressReadiness(
  enrollments: ClassEnrollment[],
  classId: string,
): ClassProgressReadiness {
  const enrolledStudents = getClassEnrollmentCount(enrollments, classId);

  if (enrolledStudents === 0) {
    return {
      enrolledStudents,
      status: 'not-ready',
      message: 'Progress appears after students join and class-scoped attempt sync is available.',
    };
  }

  return {
    enrolledStudents,
    status: 'not-ready',
    message: 'Roster is ready. Class-level progress analytics need class-scoped attempt sync.',
  };
}

export function upsertClassEnrollment(
  enrollments: ClassEnrollment[],
  enrollment: ClassEnrollment,
): ClassEnrollment[] {
  const existingEnrollment = enrollments.find(
    (candidate) =>
      candidate.classId === enrollment.classId && candidate.accountId === enrollment.accountId,
  );

  if (!existingEnrollment) {
    return [...enrollments, enrollment];
  }

  const updatedEnrollment: ClassEnrollment = {
    ...existingEnrollment,
    email: enrollment.email,
    displayName: enrollment.displayName,
    role: enrollment.role,
  };

  return enrollments.map((candidate) =>
    candidate.id === existingEnrollment.id ? updatedEnrollment : candidate,
  );
}
