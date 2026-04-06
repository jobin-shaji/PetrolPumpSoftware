import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AlertBox from '../components/AlertBox.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const LoginPage = () => {
  const { login, getDashboardPath } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: 'admin@pump.local',
    password: 'Admin@123',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const user = await login(form.email, form.password);
      navigate(getDashboardPath(user.role), { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-panel">
        <p className="eyebrow">Internal Access</p>
        <h1>Pump Management System</h1>
        <p className="subtitle">
          Sign in with your employee account to access your role dashboard.
        </p>

        <form className="entity-form" onSubmit={handleSubmit}>
          <label className="form-field">
            <span>Email</span>
            <input
              type="email"
              value={form.email}
              onChange={(event) =>
                setForm((current) => ({ ...current, email: event.target.value }))
              }
            />
          </label>

          <label className="form-field">
            <span>Password</span>
            <input
              type="password"
              value={form.password}
              onChange={(event) =>
                setForm((current) => ({ ...current, password: event.target.value }))
              }
            />
          </label>

          <AlertBox message={error} variant="error" />

          <button type="submit" className="primary-button wide" disabled={submitting}>
            {submitting ? 'Signing in...' : 'Login'}
          </button>
        </form>

        <div className="seed-help">
          <strong>Seed credentials</strong>
          <p>
            <code>admin@pump.local / Admin@123</code>
          </p>
          <p>
            <code>manager@pump.local / Manager@123</code>
          </p>
          <p>
            <code>pumpoperator@pump.local / PumpOperator@123</code>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
