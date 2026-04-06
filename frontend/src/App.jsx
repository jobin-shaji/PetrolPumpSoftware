import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { useAuth } from './context/AuthContext.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import LoginPage from './pages/LoginPage.jsx';
import ManagerDashboard from './pages/ManagerDashboard.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import PumpOperatorDashboard from './pages/PumpOperatorDashboard.jsx';

const RoleRedirect = () => {
  const { user, getDashboardPath } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={getDashboardPath(user.role)} replace />;
};

const App = () => (
  <Routes>
    <Route path="/" element={<RoleRedirect />} />
    <Route path="/login" element={<LoginPage />} />
    <Route
      path="/admin"
      element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminDashboard />
        </ProtectedRoute>
      }
    />
    <Route
      path="/manager"
      element={
        <ProtectedRoute allowedRoles={['manager']}>
          <ManagerDashboard />
        </ProtectedRoute>
      }
    />
    <Route
      path="/pump-operator"
      element={
        <ProtectedRoute allowedRoles={['pumpOperator']}>
          <PumpOperatorDashboard />
        </ProtectedRoute>
      }
    />
    <Route path="*" element={<NotFoundPage />} />
  </Routes>
);

export default App;
