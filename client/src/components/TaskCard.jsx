function formatDate(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function TaskCard({ task, onClick, showProject = false }) {
  const overdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'DONE';
  return (
    <div className={`task-card ${overdue ? 'overdue' : ''}`} onClick={onClick} role="button" tabIndex={0}>
      <div className="title">{task.title}</div>
      <div className="row wrap" style={{ gap: 6 }}>
        <span className={`badge ${task.status.toLowerCase()}`}>{task.status.replace('_', ' ')}</span>
        <span className={`badge ${task.priority.toLowerCase()}`}>{task.priority}</span>
        {overdue && <span className="badge overdue">Overdue</span>}
      </div>
      <div className="footer">
        <span>{task.assignee ? `→ ${task.assignee.name}` : 'Unassigned'}</span>
        <span>{formatDate(task.dueDate) || ''}</span>
      </div>
      {showProject && task.project && (
        <div className="muted" style={{ fontSize: 11, marginTop: 6 }}>{task.project.name}</div>
      )}
    </div>
  );
}
