import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getRoleLabel } from '../utils/roles.js';

const linksByRole = {
  admin: [
    { label: 'Dashboard', to: '/dashboard' },
    { label: 'Users', to: '/dashboard/users' },
    { label: 'Setup', to: '/dashboard/setup' },
    { label: 'Sessions', to: '/dashboard/sessions' },
    { label: 'Analytics', to: '/dashboard/analytics' },
  ],
  manager: [
    { label: 'Dashboard', to: '/dashboard' },
    { label: 'Units', to: '/dashboard/units' },
    { label: 'Purchases', to: '/dashboard/purchases' },
    { label: 'Analytics', to: '/dashboard/analytics' },
  ],
  pumpOperator: [
    { label: 'Dashboard', to: '/dashboard' },
    { label: 'Session', to: '/dashboard/session' },
    { label: 'Readings', to: '/dashboard/readings' },
  ],
};

const Layout = ({ title, subtitle, children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const links = linksByRole[user?.role] || [];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">Petrol Pump Management</p>
          <nav className="sidebar-nav">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={
                  location.pathname === link.to || location.pathname.startsWith(`${link.to}/`)
                    ? 'nav-link active'
                    : 'nav-link'
                }
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </aside>

      <div className="app-content">
        <header className="topbar">
          <div>
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

        <main className="dashboard-grid">{children}</main>
      </div>
    </div>
  );
};

export default Layout;
