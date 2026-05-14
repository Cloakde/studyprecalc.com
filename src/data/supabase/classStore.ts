import { useCallback, useEffect, useState } from 'react';

import type { PublicAccount } from '../localAccountStore';
import {
  createClassEnrollment,
  createClassRecord,
  sortClasses,
  upsertClassEnrollment,
  type ClassEnrollment,
  type ClassEnrollmentRole,
  type ClassRecord,
} from '../../domain/classes';
import { supabase } from './client';

export type ClassRow = {
  id: string;
  name: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

export type EnrollmentRow = {
  id: string;
  class_id: string;
  account_id: string;
  email: string;
  display_name: string;
  role: ClassEnrollmentRole;
  created_at: string;
};

type UseSupabaseClassStoreOptions = {
  enabled: boolean;
  userId?: string;
};

export function classFromSupabaseRow(row: ClassRow): ClassRecord {
  return createClassRecord({
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(row.description ? { description: row.description } : {}),
    ...(row.created_by ? { createdBy: row.created_by } : {}),
    ...(row.archived_at ? { archivedAt: row.archived_at } : {}),
  });
}

export function enrollmentFromSupabaseRow(row: EnrollmentRow): ClassEnrollment {
  return createClassEnrollment({
    id: row.id,
    classId: row.class_id,
    accountId: row.account_id,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
    createdAt: row.created_at,
  });
}

export function useSupabaseClassStore({ enabled, userId }: UseSupabaseClassStoreOptions) {
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [enrollments, setEnrollments] = useState<ClassEnrollment[]>([]);
  const [lastError, setLastError] = useState('');

  const refreshClasses = useCallback(async () => {
    if (!enabled || !supabase) {
      setClasses([]);
      setEnrollments([]);
      return;
    }

    const [classResponse, enrollmentResponse] = await Promise.all([
      supabase.from('classes').select('*').order('name', { ascending: true }),
      supabase.from('class_enrollments').select('*').order('created_at', { ascending: false }),
    ]);

    if (classResponse.error) {
      setLastError(classResponse.error.message);
      return;
    }

    if (enrollmentResponse.error) {
      setLastError(enrollmentResponse.error.message);
      return;
    }

    setClasses(
      sortClasses((classResponse.data ?? []).map((row) => classFromSupabaseRow(row as ClassRow))),
    );
    setEnrollments(
      (enrollmentResponse.data ?? []).map((row) => enrollmentFromSupabaseRow(row as EnrollmentRow)),
    );
    setLastError('');
  }, [enabled]);

  const createClass = useCallback(
    async (input: { name: string; description?: string; createdBy?: string }) => {
      if (!enabled || !supabase || !userId) {
        throw new Error('Cloud classes are not available.');
      }

      const name = input.name.trim();

      if (!name) {
        throw new Error('Enter a class name.');
      }

      const { data, error } = await supabase
        .from('classes')
        .insert({
          name,
          description: input.description?.trim() || null,
          created_by: input.createdBy ?? userId,
        })
        .select('*')
        .single();

      if (error) {
        setLastError(error.message);
        throw new Error(error.message);
      }

      const classRecord = classFromSupabaseRow(data as ClassRow);
      setClasses((currentClasses) => sortClasses([...currentClasses, classRecord]));
      setLastError('');
      return classRecord;
    },
    [enabled, userId],
  );

  const enrollAccount = useCallback(
    async (classId: string, account: PublicAccount) => {
      if (!enabled || !supabase) {
        return null;
      }

      const { data, error } = await supabase
        .from('class_enrollments')
        .upsert(
          {
            class_id: classId,
            account_id: account.id,
            email: account.email,
            display_name: account.displayName,
            role: account.role,
          },
          { onConflict: 'class_id,account_id' },
        )
        .select('*')
        .single();

      if (error) {
        setLastError(error.message);
        return null;
      }

      const enrollment = enrollmentFromSupabaseRow(data as EnrollmentRow);
      setEnrollments((currentEnrollments) => upsertClassEnrollment(currentEnrollments, enrollment));
      setLastError('');
      return enrollment;
    },
    [enabled],
  );

  useEffect(() => {
    void refreshClasses();
  }, [refreshClasses]);

  return {
    classes,
    enrollments,
    lastError,
    createClass,
    enrollAccount,
    refreshClasses,
  };
}
