import { useState, useEffect } from 'react';

const STATUSES = ['TODO', 'IN_PROGRESS', 'DONE'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'];

function toDateInput(d) {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt)) return '';
  return dt.toISOString().slice(0, 10);
}

export default function TaskForm({ initial, members, onSubmit, onCancel, onDelete, canDelete, canReassign }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    status: 'TODO',
    priority: 'MEDIUM',
    dueDate: '',
    assigneeId: '',
  });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (initial) {
      setForm({
        title: initial.title || '',
        description: initial.description || '',
        status: initial.status || 'TODO',
        priority: initial.priority || 'MEDIUM',
        dueDate: toDateInput(initial.dueDate),
        assigneeId: initial.assigneeId || '',
      });
    }
  }, [initial]);

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await onSubmit({
        ...form,
        dueDate: form.dueDate || null,
        assigneeId: form.assigneeId || null,
        description: form.description || null,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="error">{error}</div>}
      <div className="field">
        <label>Title *</label>
        <input value={form.title} onChange={update('title')} required maxLength={200} />
      </div>
      <div className="field">
        <label>Description</label>
        <textarea rows={3} value={form.description} onChange={update('description')} />
      </div>
      <div className="grid cols-3">
        <div className="field">
          <label>Status</label>
          <select value={form.status} onChange={update('status')}>
            {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Priority</label>
          <select value={form.priority} onChange={update('priority')}>
            {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Due date</label>
          <input type="date" value={form.dueDate} onChange={update('dueDate')} />
        </div>
      </div>
      <div className="field">
        <label>Assignee {!canReassign && <span className="muted">(admin only)</span>}</label>
        <select value={form.assigneeId} onChange={update('assigneeId')} disabled={!canReassign}>
          <option value="">Unassigned</option>
          {members.map((m) => (
            <option key={m.userId} value={m.userId}>{m.name} ({m.email})</option>
          ))}
        </select>
      </div>
      <div className="modal-actions">
        {canDelete && onDelete && (
          <button type="button" className="danger" onClick={onDelete} disabled={busy}>Delete</button>
        )}
        <button type="button" className="secondary" onClick={onCancel} disabled={busy}>Cancel</button>
        <button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
      </div>
    </form>
  );
}
