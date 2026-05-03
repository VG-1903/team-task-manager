import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import Modal from '../components/Modal.jsx';

export default function Projects() {
  const [projects, setProjects] = useState(null);
  const [error, setError] = useState(null);
  const [openModal, setOpenModal] = useState(false);

  const load = () => api.get('/projects').then((r) => setProjects(r.projects)).catch((e) => setError(e.message));

  useEffect(() => { load(); }, []);

  if (error) return <div className="container"><div className="error">{error}</div></div>;

  return (
    <div className="container">
      <div className="row between" style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Projects</h2>
        <button onClick={() => setOpenModal(true)}>+ New project</button>
      </div>

      {projects === null && <div className="loading">Loading…</div>}

      {projects && projects.length === 0 && (
        <div className="empty-state">
          <h2>No projects yet</h2>
          <p>Create your first project to start collaborating with your team.</p>
          <button onClick={() => setOpenModal(true)}>Create project</button>
        </div>
      )}

      {projects && projects.length > 0 && (
        <div className="grid cols-2">
          {projects.map((p) => (
            <Link key={p.id} to={`/projects/${p.id}`} className="project-card">
              <div className="row between">
                <h3>{p.name}</h3>
                <span className={`badge ${p.role.toLowerCase()}`}>{p.role}</span>
              </div>
              {p.description && <p className="muted" style={{ margin: '8px 0 0' }}>{p.description}</p>}
              <div className="meta">
                <span>{p.taskCount} {p.taskCount === 1 ? 'task' : 'tasks'}</span>
                <span>{p.memberCount} {p.memberCount === 1 ? 'member' : 'members'}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <Modal open={openModal} title="New project" onClose={() => setOpenModal(false)}>
        <CreateProjectForm
          onCancel={() => setOpenModal(false)}
          onSaved={() => { setOpenModal(false); load(); }}
        />
      </Modal>
    </div>
  );
}

function CreateProjectForm({ onCancel, onSaved }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.post('/projects', { name, description: description || null });
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit}>
      {error && <div className="error">{error}</div>}
      <div className="field">
        <label>Project name *</label>
        <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} autoFocus />
      </div>
      <div className="field">
        <label>Description</label>
        <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="modal-actions">
        <button type="button" className="secondary" onClick={onCancel} disabled={busy}>Cancel</button>
        <button type="submit" disabled={busy || !name.trim()}>{busy ? 'Creating…' : 'Create project'}</button>
      </div>
    </form>
  );
}
