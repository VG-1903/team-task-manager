import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;
  return (
    <header className="navbar">
      <NavLink to="/" className="brand">📋 Team Task Manager</NavLink>
      <nav>
        <NavLink to="/" end>Dashboard</NavLink>
        <NavLink to="/projects">Projects</NavLink>
      </nav>
      <div className="user">
        <span className="muted">{user.name}</span>
        <button className="ghost small" onClick={() => { logout(); navigate('/login'); }}>Sign out</button>
      </div>
    </header>
  );
}
