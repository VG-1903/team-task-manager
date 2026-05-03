import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client';
import Modal from '../components/Modal.jsx';
import TaskCard from '../components/TaskCard.jsx';
import TaskForm from '../components/TaskForm.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const COLUMNS = [
  { key: 'TODO', label: 'To Do' },
  { key: 'IN_PROGRESS', label: 'In Progress' },
  { key: 'DONE', label: 'Done' },
];

export default function ProjectDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState(null);
  const [taskModal, setTaskModal] = useState({ open: false, initial: null });
  const [memberModal, setMemberModal] = useState(false);

  const isAdmin = project && project.role === 'ADMIN';

  const load = useCallback(async () => {
    try {
      const [p, t] = await Promise.all([
        api.get(`/projects/${id}`),
        api.get(`/projects/${id}/tasks`),
      ]);
      setProject(p.project);
      setTasks(t.tasks);
    } catch (err) {
      setError(err.message);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const saveTask = async (data) => {
    if (taskModal.initial) {
      await api.patch(`/projects/${id}/tasks/${taskModal.initial.id}`, data);
    } else {
      await api.post(`/projects/${id}/tasks`, data);
    }
    setTaskModal({ open: false, initial: null });
    await load();
  };

  const deleteTask = async () => {
    if (!taskModal.initial) return;
    if (!confirm('Delete this task? This cannot be undone.')) return;
    await api.delete(`/projects/${id}/tasks/${taskModal.initial.id}`);
    setTaskModal({ open: false, initial: null });
    await load();
  };

  const deleteProject = async () => {
    if (!confirm(`Delete project "${project.name}" and all its tasks? This cannot be undone.`)) return;
    await api.delete(`/projects/${id}`);
    navigate('/projects');
  };

  if (error) return <div className="container"><div className="error">{error}</div></div>;
  if (!project) return <div className="loading">Loading project…</div>;

  const tasksByStatus = COLUMNS.map((c) => ({
    ...c,
    tasks: tasks.filter((t) => t.status === c.key),
  }));

  return (
    <div className="container">
      <div className="row between" style={{ marginBottom: 8 }}>
        <div>
          <Link to="/projects" className="muted" style={{ fontSize: 13 }}>← All projects</Link>
          <h2 style={{ margin: '4px 0' }}>
            {project.name}{' '}
            <span className={`badge ${project.role.toLowerCase()}`}>{project.role}</span>
          </h2>
          {project.description && <p className="muted" style={{ margin: 0 }}>{project.description}</p>}
        </div>
        <div className="row">
          <button onClick={() => setTaskModal({ open: true, initial: null })}>+ New task</button>
          {isAdmin && <button className="secondary" onClick={() => setMemberModal(true)}>Manage team</button>}
          {isAdmin && <button className="ghost small" onClick={deleteProject}>Delete project</button>}
        </div>
      </div>

      <div className="board" style={{ marginTop: 16 }}>
        {tasksByStatus.map((col) => (
          <div key={col.key} className="column">
            <h3>{col.label} <span className="muted">({col.tasks.length})</span></h3>
            {col.tasks.length === 0 && <div className="muted" style={{ fontSize: 13, padding: '8px 0' }}>No tasks here.</div>}
            {col.tasks.map((t) => (
              <TaskCard key={t.id} task={t} onClick={() => setTaskModal({ open: true, initial: t })} />
            ))}
          </div>
        ))}
      </div>

      <Modal
        open={taskModal.open}
        title={taskModal.initial ? 'Edit task' : 'New task'}
        onClose={() => setTaskModal({ open: false, initial: null })}
      >
        <TaskForm
          initial={taskModal.initial}
          members={project.members}
          onSubmit={saveTask}
          onCancel={() => setTaskModal({ open: false, initial: null })}
          onDelete={deleteTask}
          canDelete={!!taskModal.initial && (isAdmin || taskModal.initial.creatorId === user.id)}
          canReassign={isAdmin || !taskModal.initial}
        />
      </Modal>

      <Modal open={memberModal} title="Team members" onClose={() => setMemberModal(false)}>
        <MemberManager
          projectId={id}
          members={project.members}
          ownerId={project.ownerId}
          onChanged={async () => { await load(); }}
        />
      </Modal>
    </div>
  );
}

function MemberManager({ projectId, members, ownerId, onChanged }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('MEMBER');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);

  const invite = async (e) => {
    e.preventDefault();
    setError(null); setInfo(null); setBusy(true);
    try {
      await api.post(`/projects/${projectId}/members`, { email, role });
      setEmail(''); setInfo('Member added');
      await onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const changeRole = async (memberId, newRole) => {
    setError(null);
    try {
      await api.patch(`/projects/${projectId}/members/${memberId}`, { role: newRole });
      await onChanged();
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (memberId, name) => {
    if (!confirm(`Remove ${name} from this project?`)) return;
    setError(null);
    try {
      await api.delete(`/projects/${projectId}/members/${memberId}`);
      await onChanged();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <form onSubmit={invite} style={{ marginBottom: 16 }}>
        {error && <div className="error">{error}</div>}
        {info && <div className="muted" style={{ marginBottom: 8 }}>{info}</div>}
        <div className="row">
          <input
            type="email"
            placeholder="user@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <select value={role} onChange={(e) => setRole(e.target.value)} style={{ width: 140 }}>
            <option value="MEMBER">Member</option>
            <option value="ADMIN">Admin</option>
          </select>
          <button type="submit" disabled={busy}>{busy ? 'Adding…' : 'Add'}</button>
        </div>
        <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
          The user must already have an account.
        </p>
      </form>

      <ul className="list-clean">
        {members.map((m) => (
          <li key={m.id}>
            <div>
              <div>{m.name} {m.userId === ownerId && <span className="muted">(owner)</span>}</div>
              <div className="muted" style={{ fontSize: 12 }}>{m.email}</div>
            </div>
            <div className="row">
              <select
                value={m.role}
                onChange={(e) => changeRole(m.id, e.target.value)}
                disabled={m.userId === ownerId}
                style={{ width: 110 }}
              >
                <option value="MEMBER">Member</option>
                <option value="ADMIN">Admin</option>
              </select>
              {m.userId !== ownerId && (
                <button className="ghost small" onClick={() => remove(m.id, m.name)}>Remove</button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
