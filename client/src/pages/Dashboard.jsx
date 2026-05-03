import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import TaskCard from '../components/TaskCard.jsx';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/dashboard').then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="container"><div className="error">{error}</div></div>;
  if (!data) return <div className="loading">Loading dashboard…</div>;

  const { summary, tasks, projectCount } = data;

  return (
    <div className="container">
      <div className="section">
        <h2>Dashboard</h2>
        <p className="muted" style={{ marginTop: -8 }}>
          Across {projectCount} {projectCount === 1 ? 'project' : 'projects'}
        </p>

        <div className="grid cols-4">
          <div className="stat"><div className="label">Total tasks</div><div className="value">{summary.total}</div></div>
          <div className="stat"><div className="label">To do</div><div className="value">{summary.todo}</div></div>
          <div className="stat warning"><div className="label">In progress</div><div className="value">{summary.inProgress}</div></div>
          <div className="stat success"><div className="label">Done</div><div className="value">{summary.done}</div></div>
          <div className="stat danger"><div className="label">Overdue</div><div className="value">{summary.overdue}</div></div>
          <div className="stat"><div className="label">Assigned to me</div><div className="value">{summary.assignedToMe}</div></div>
        </div>
      </div>

      <DashboardGroup
        title="Assigned to me"
        emptyText="Nothing on your plate. Nice."
        tasks={tasks.assignedToMe}
      />
      <DashboardGroup
        title={`Overdue (${tasks.overdue.length})`}
        emptyText="No overdue tasks."
        tasks={tasks.overdue}
      />
      <DashboardGroup
        title="Due in the next 7 days"
        emptyText="No upcoming deadlines."
        tasks={tasks.dueSoon}
      />
      <DashboardGroup
        title="Recently completed"
        emptyText="No completed tasks yet."
        tasks={tasks.recentlyCompleted}
      />

      {projectCount === 0 && (
        <div className="empty-state">
          <h2>No projects yet</h2>
          <p>Create your first project to start tracking tasks.</p>
          <Link to="/projects"><button>Go to projects</button></Link>
        </div>
      )}
    </div>
  );
}

function DashboardGroup({ title, tasks, emptyText }) {
  if (!tasks || tasks.length === 0) {
    return (
      <div className="section">
        <h2>{title}</h2>
        <div className="card muted">{emptyText}</div>
      </div>
    );
  }
  return (
    <div className="section">
      <h2>{title}</h2>
      <div className="grid cols-3">
        {tasks.map((t) => (
          <Link key={t.id} to={`/projects/${t.projectId}`} style={{ color: 'inherit' }}>
            <TaskCard task={t} showProject />
          </Link>
        ))}
      </div>
    </div>
  );
}
