import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getRoleLabel } from '../utils/roles.js';

const linksByRole = {
  admin: [{ label: 'Admin', to: '/admin' }],
  manager: [{ label: 'Manager', to: '/manager' }],
  pumpOperator: [{ label: 'Pump Operator', to: '/pump-operator' }],
};

const Layout = ({ title, subtitle, children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const links = linksByRole[user?.role] || [];

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Petrol Pump Management</p>
          <h1>{title}</h1>
          {subtitle ? <p className="subtitle">{subtitle}</p> : null}
        </div>
        <div className="topbar-meta">
          <div className="user-chip">
            <strong>{user?.name}</strong>
            <span>{getRoleLabel(user?.role)}</span>
          </div>
          <button type="button" className="ghost-button" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      <nav className="nav-strip">
        {links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className={location.pathname === link.to ? 'nav-link active' : 'nav-link'}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <main className="dashboard-grid">{children}</main>
    </div>
  );
};

export default Layout;
