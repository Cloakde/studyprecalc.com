import { Ban, Clipboard, GraduationCap, Plus, RotateCcw, Ticket, Users } from 'lucide-react';
import { type FormEvent, useMemo, useState } from 'react';

import {
  getClassEnrollmentCount,
  type ClassEnrollment,
  type ClassRecord,
} from '../../domain/classes';
import {
  isInviteConsumed,
  isInviteExpired,
  isInviteRevoked,
  type InviteCodeRecord,
} from '../../domain/invites';

type AdminCreateInviteInput = {
  classId: string;
  email?: string;
  expiresAt?: string;
};

type AdminClassManagerProps = {
  classes: ClassRecord[];
  enrollments: ClassEnrollment[];
  invites: InviteCodeRecord[];
  onCreateClass: (input: {
    name: string;
    description?: string;
  }) => ClassRecord | Promise<ClassRecord>;
  onCreateInvite: (input: AdminCreateInviteInput) => InviteCodeRecord | Promise<InviteCodeRecord>;
  onRevokeInvite: (inviteId: string) => void | Promise<void>;
  onRefresh?: () => void | Promise<void>;
};

type InviteDisplayStatus = 'active' | 'expired' | 'used' | 'revoked';

function timestampMs(value: string | undefined): number {
  if (!value) {
    return 0;
  }

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function formatDate(value: string | undefined, fallback: string): string {
  if (!value) {
    return fallback;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function formatExpirationDate(value: string | undefined): string {
  return formatDate(value, 'No expiration');
}

function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function getInviteDisplayStatus(invite: InviteCodeRecord): InviteDisplayStatus {
  if (isInviteRevoked(invite)) {
    return 'revoked';
  }

  if (isInviteConsumed(invite)) {
    return 'used';
  }

  if (isInviteExpired(invite)) {
    return 'expired';
  }

  return 'active';
}

function getInviteStatusCounts(invites: InviteCodeRecord[]) {
  return invites.reduce(
    (counts, invite) => {
      counts[getInviteDisplayStatus(invite)] += 1;
      return counts;
    },
    {
      active: 0,
      expired: 0,
      revoked: 0,
      used: 0,
    } satisfies Record<InviteDisplayStatus, number>,
  );
}

function getEndOfDayIso(dateValue: string): string | undefined {
  const [year, month, day] = dateValue.split('-').map(Number);

  if (!year || !month || !day) {
    return undefined;
  }

  const date = new Date(year, month - 1, day, 23, 59, 59, 999);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export function AdminClassManager({
  classes,
  enrollments,
  invites,
  onCreateClass,
  onCreateInvite,
  onRefresh,
  onRevokeInvite,
}: AdminClassManagerProps) {
  const [className, setClassName] = useState('');
  const [classDescription, setClassDescription] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteExpiresAt, setInviteExpiresAt] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [isWorking, setIsWorking] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [revokingInviteId, setRevokingInviteId] = useState('');

  const activeClassId = selectedClassId || classes[0]?.id || '';
  const classSummaries = useMemo(
    () =>
      classes.map((classRecord) => {
        const classInvites = invites.filter((invite) => invite.classId === classRecord.id);
        const inviteCounts = getInviteStatusCounts(classInvites);

        return {
          activeInviteCount: inviteCounts.active,
          classRecord,
          enrollmentCount: getClassEnrollmentCount(enrollments, classRecord.id),
          expiredInviteCount: inviteCounts.expired,
          revokedInviteCount: inviteCounts.revoked,
          usedInviteCount: inviteCounts.used,
        };
      }),
    [classes, enrollments, invites],
  );
  const activeClassSummary =
    classSummaries.find((summary) => summary.classRecord.id === activeClassId) ?? null;
  const activeClass = activeClassSummary?.classRecord ?? null;
  const activeClassEnrollments = useMemo(
    () =>
      enrollments
        .filter((enrollment) => enrollment.classId === activeClassId)
        .sort((first, second) => first.displayName.localeCompare(second.displayName)),
    [activeClassId, enrollments],
  );
  const activeClassInvites = useMemo(
    () =>
      invites
        .filter((invite) => invite.classId === activeClassId)
        .sort((first, second) => timestampMs(second.createdAt) - timestampMs(first.createdAt)),
    [activeClassId, invites],
  );
  const activeInviteCounts = useMemo(
    () => getInviteStatusCounts(activeClassInvites),
    [activeClassInvites],
  );
  const totalInviteCounts = useMemo(() => getInviteStatusCounts(invites), [invites]);
  const activeClassDescription = activeClass?.description?.trim() || 'No description added.';

  async function submitClass(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice('');
    setError('');

    const trimmedName = className.trim();
    const trimmedDescription = classDescription.trim();

    if (!trimmedName) {
      setError('Enter a class name.');
      return;
    }

    setIsWorking(true);

    try {
      const createdClass = await onCreateClass({
        name: trimmedName,
        ...(trimmedDescription ? { description: trimmedDescription } : {}),
      });
      setSelectedClassId(createdClass.id);
      setClassName('');
      setClassDescription('');
      setNotice(`Created ${createdClass.name}.`);
    } catch (classError) {
      setError(classError instanceof Error ? classError.message : 'Unable to create class.');
    } finally {
      setIsWorking(false);
    }
  }

  async function submitInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice('');
    setError('');

    if (!activeClassId) {
      setError('Create a class before making invites.');
      return;
    }

    const trimmedEmail = inviteEmail.trim();
    const expiresAt = inviteExpiresAt ? getEndOfDayIso(inviteExpiresAt) : undefined;

    if (inviteExpiresAt && !expiresAt) {
      setError('Enter a valid expiration date.');
      return;
    }

    setIsWorking(true);

    try {
      const invite = await onCreateInvite({
        classId: activeClassId,
        ...(trimmedEmail ? { email: trimmedEmail } : {}),
        ...(expiresAt ? { expiresAt } : {}),
      });
      setInviteEmail('');
      setInviteExpiresAt('');
      setNotice(`Invite created: ${invite.code}`);
    } catch (inviteError) {
      setError(inviteError instanceof Error ? inviteError.message : 'Unable to create invite.');
    } finally {
      setIsWorking(false);
    }
  }

  async function refreshClassData() {
    if (!onRefresh) {
      return;
    }

    setNotice('');
    setError('');
    setIsRefreshing(true);

    try {
      await onRefresh();
      setNotice('Class data refreshed.');
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : 'Unable to refresh classes.');
    } finally {
      setIsRefreshing(false);
    }
  }

  async function copyInviteCode(invite: InviteCodeRecord) {
    setNotice('');
    setError('');

    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      setError('Clipboard copy is unavailable in this browser.');
      return;
    }

    try {
      await navigator.clipboard.writeText(invite.code);
      setNotice(`Copied invite ${invite.code}.`);
    } catch (copyError) {
      setError(copyError instanceof Error ? copyError.message : 'Unable to copy invite code.');
    }
  }

  async function revokeInvite(invite: InviteCodeRecord) {
    setNotice('');
    setError('');
    setRevokingInviteId(invite.id);

    try {
      await onRevokeInvite(invite.id);
      setNotice(`Revoked invite ${invite.code}.`);
    } catch (revokeError) {
      setError(revokeError instanceof Error ? revokeError.message : 'Unable to revoke invite.');
    } finally {
      setRevokingInviteId('');
    }
  }

  return (
    <main className="admin-shell">
      <section className="manager-header admin-header">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>Classes & Invites</h1>
          <p className="manager-header__copy">
            Manage class sections, invite codes, and student rosters from one workspace.
          </p>
        </div>
        <div className="manager-actions">
          {onRefresh ? (
            <button
              className="ghost-button"
              disabled={isRefreshing}
              onClick={() => void refreshClassData()}
              type="button"
            >
              <RotateCcw aria-hidden="true" />
              {isRefreshing ? 'Refreshing' : 'Refresh'}
            </button>
          ) : null}
        </div>
      </section>

      <section className="admin-overview-grid" aria-label="Class management overview">
        <article className="admin-stat-card">
          <span>Classes</span>
          <strong>{classes.length}</strong>
          <small>{activeClass ? `Viewing ${activeClass.name}` : 'No class selected'}</small>
        </article>
        <article className="admin-stat-card">
          <span>Roster</span>
          <strong>{enrollments.length}</strong>
          <small>{pluralize(activeClassEnrollments.length, 'student')} in selected class</small>
        </article>
        <article className="admin-stat-card">
          <span>Active invites</span>
          <strong>{totalInviteCounts.active}</strong>
          <small>
            {totalInviteCounts.used} used, {totalInviteCounts.expired} expired,{' '}
            {totalInviteCounts.revoked} revoked
          </small>
        </article>
      </section>

      {notice ? (
        <div className="form-notice" role="status">
          {notice}
        </div>
      ) : null}
      {error ? (
        <div className="form-error" role="alert">
          {error}
        </div>
      ) : null}

      <div className="admin-grid">
        <section className="admin-panel">
          <div className="section-heading-row">
            <div>
              <h2>Create Class</h2>
              <p>{pluralize(classes.length, 'class', 'classes')} available</p>
            </div>
            <GraduationCap aria-hidden="true" />
          </div>
          <form className="admin-form" onSubmit={submitClass}>
            <label>
              Class Name
              <input
                onChange={(event) => setClassName(event.target.value)}
                required
                value={className}
              />
            </label>
            <label>
              Description
              <textarea
                onChange={(event) => setClassDescription(event.target.value)}
                placeholder="Period 2, Spring review, after-school group"
                rows={3}
                value={classDescription}
              />
            </label>
            <button
              className="primary-button"
              disabled={isWorking || !className.trim()}
              type="submit"
            >
              <Plus aria-hidden="true" />
              Create Class
            </button>
          </form>
        </section>

        <section className="admin-panel">
          <div className="section-heading-row">
            <div>
              <h2>Create Invite</h2>
              <p>{activeClass ? `For ${activeClass.name}` : 'Create a class first'}</p>
            </div>
            <Ticket aria-hidden="true" />
          </div>
          <form className="admin-form" onSubmit={submitInvite}>
            <label>
              Class
              <select
                disabled={classes.length === 0}
                onChange={(event) => setSelectedClassId(event.target.value)}
                value={activeClassId}
              >
                {classes.length === 0 ? <option value="">No classes yet</option> : null}
                {classes.map((classRecord) => (
                  <option key={classRecord.id} value={classRecord.id}>
                    {classRecord.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Student Email (Optional)
              <input
                placeholder="student@example.com"
                onChange={(event) => setInviteEmail(event.target.value)}
                type="email"
                value={inviteEmail}
              />
            </label>
            <label>
              Expiration Date (Optional)
              <input
                onChange={(event) => setInviteExpiresAt(event.target.value)}
                type="date"
                value={inviteExpiresAt}
              />
            </label>
            <button className="primary-button" disabled={isWorking || !activeClassId} type="submit">
              <Ticket aria-hidden="true" />
              Create Invite
            </button>
          </form>
        </section>

        <section className="admin-panel admin-panel--wide">
          <div className="section-heading-row">
            <div>
              <h2>Class Overview</h2>
              <p>{activeClass ? `${activeClass.name} selected` : 'No class selected'}</p>
            </div>
            <Users aria-hidden="true" />
          </div>
          {classes.length === 0 ? (
            <p className="empty-list-copy">Create your first class to start issuing invites.</p>
          ) : (
            <div className="class-summary-grid">
              {classSummaries.map((summary) => (
                <button
                  className="class-summary-card"
                  data-active={summary.classRecord.id === activeClassId}
                  key={summary.classRecord.id}
                  onClick={() => setSelectedClassId(summary.classRecord.id)}
                  type="button"
                >
                  <strong>{summary.classRecord.name}</strong>
                  <span>{pluralize(summary.enrollmentCount, 'student')}</span>
                  <small>
                    {summary.activeInviteCount} active, {summary.usedInviteCount} used,{' '}
                    {summary.expiredInviteCount} expired, {summary.revokedInviteCount} revoked
                  </small>
                  <small>{summary.classRecord.description || 'No description'}</small>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="admin-panel admin-panel--wide admin-class-detail">
          <div className="section-heading-row">
            <div>
              <h2>{activeClass?.name ?? 'Selected Class'}</h2>
              <p>{activeClassDescription}</p>
            </div>
            <GraduationCap aria-hidden="true" />
          </div>
          <div className="admin-detail-metrics">
            <span>
              <strong>{activeClassSummary?.enrollmentCount ?? 0}</strong>
              Students
            </span>
            <span>
              <strong>{activeInviteCounts.active}</strong>
              Active Invites
            </span>
            <span>
              <strong>{activeInviteCounts.used}</strong>
              Used
            </span>
            <span>
              <strong>{activeInviteCounts.expired}</strong>
              Expired
            </span>
            <span>
              <strong>{activeInviteCounts.revoked}</strong>
              Revoked
            </span>
          </div>
        </section>

        <section className="admin-panel">
          <div className="section-heading-row">
            <div>
              <h2>Invites</h2>
              <p>
                {activeInviteCounts.active} active, {activeInviteCounts.used} used,{' '}
                {activeInviteCounts.expired} expired, {activeInviteCounts.revoked} revoked
              </p>
            </div>
            <Ticket aria-hidden="true" />
          </div>
          <div className="admin-list">
            {activeClassInvites.length === 0 ? (
              <p className="empty-list-copy">No invites for this class yet.</p>
            ) : null}
            {activeClassInvites.map((invite) => {
              const status = getInviteDisplayStatus(invite);

              return (
                <article className="admin-list-card" key={invite.id}>
                  <div className="admin-list-card__header">
                    <strong>{invite.code}</strong>
                    <span data-status={status}>{status}</span>
                  </div>
                  <div className="admin-list-card__meta">
                    <small>{invite.email ?? 'Any invited student'}</small>
                    <small>Created {formatDate(invite.createdAt, 'Not recorded')}</small>
                    <small>Expires {formatExpirationDate(invite.expiresAt)}</small>
                    {invite.revokedAt ? (
                      <small>Revoked {formatDate(invite.revokedAt, 'Not recorded')}</small>
                    ) : null}
                  </div>
                  <div className="action-row">
                    <button
                      className="ghost-button"
                      onClick={() => void copyInviteCode(invite)}
                      type="button"
                    >
                      <Clipboard aria-hidden="true" />
                      Copy
                    </button>
                    {status === 'active' ? (
                      <button
                        className="danger-button"
                        disabled={revokingInviteId === invite.id}
                        onClick={() => void revokeInvite(invite)}
                        type="button"
                      >
                        <Ban aria-hidden="true" />
                        {revokingInviteId === invite.id ? 'Revoking' : 'Revoke'}
                      </button>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="admin-panel">
          <div className="section-heading-row">
            <div>
              <h2>Roster</h2>
              <p>{pluralize(activeClassEnrollments.length, 'student')} enrolled</p>
            </div>
            <Users aria-hidden="true" />
          </div>
          <div className="admin-list">
            {activeClassEnrollments.length === 0 ? (
              <p className="empty-list-copy">No students have joined this class yet.</p>
            ) : null}
            {activeClassEnrollments.map((enrollment) => (
              <article className="admin-list-card" key={enrollment.id}>
                <div className="admin-list-card__header">
                  <strong>{enrollment.displayName}</strong>
                  <span>{enrollment.role}</span>
                </div>
                <div className="admin-list-card__meta">
                  <small>{enrollment.email}</small>
                  <small>Joined {formatDate(enrollment.createdAt, 'Not recorded')}</small>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
