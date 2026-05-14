import {
  classFromSupabaseRow,
  enrollmentFromSupabaseRow,
  type ClassRow,
  type EnrollmentRow,
} from '../../src/data/supabase/classStore';

describe('supabase class row mapping', () => {
  it('maps class rows and nullable columns into domain records', () => {
    const row: ClassRow = {
      id: 'class-1',
      name: '  Period 1  ',
      description: null,
      created_by: null,
      created_at: '2026-05-13T10:00:00.000Z',
      updated_at: '2026-05-13T11:00:00.000Z',
      archived_at: null,
    };

    expect(classFromSupabaseRow(row)).toEqual({
      id: 'class-1',
      name: 'Period 1',
      createdAt: '2026-05-13T10:00:00.000Z',
      updatedAt: '2026-05-13T11:00:00.000Z',
    });

    expect(
      classFromSupabaseRow({
        ...row,
        description: '  Morning section  ',
        created_by: 'admin-1',
        archived_at: '2026-05-14T10:00:00.000Z',
      }),
    ).toEqual({
      id: 'class-1',
      name: 'Period 1',
      description: 'Morning section',
      createdBy: 'admin-1',
      createdAt: '2026-05-13T10:00:00.000Z',
      updatedAt: '2026-05-13T11:00:00.000Z',
      archivedAt: '2026-05-14T10:00:00.000Z',
    });
  });

  it('maps enrollment rows into normalized roster records', () => {
    const row: EnrollmentRow = {
      id: 'enrollment-1',
      class_id: 'class-1',
      account_id: 'account-1',
      email: 'Student@Example.com',
      display_name: '  Student One  ',
      role: 'student',
      created_at: '2026-05-13T12:00:00.000Z',
    };

    expect(enrollmentFromSupabaseRow(row)).toEqual({
      id: 'enrollment-1',
      classId: 'class-1',
      accountId: 'account-1',
      email: 'student@example.com',
      displayName: 'Student One',
      role: 'student',
      createdAt: '2026-05-13T12:00:00.000Z',
    });
  });
});
