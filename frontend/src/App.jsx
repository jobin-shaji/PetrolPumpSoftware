import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { useAuth } from './context/AuthContext.jsx';
import DashboardHome from './pages/DashboardHome.jsx';
import DashboardAnalytics from './pages/DashboardAnalytics.jsx';
import DashboardAdminFuelTypes from './pages/DashboardAdminFuelTypes.jsx';
import DashboardAdminNozzles from './pages/DashboardAdminNozzles.jsx';
import DashboardAdminSessions from './pages/DashboardAdminSessions.jsx';
import DashboardAdminTanks from './pages/DashboardAdminTanks.jsx';
import DashboardAdminUnits from './pages/DashboardAdminUnits.jsx';
import DashboardAdminUsers from './pages/DashboardAdminUsers.jsx';
import DashboardManagerPurchases from './pages/DashboardManagerPurchases.jsx';
import DashboardManagerUnits from './pages/DashboardManagerUnits.jsx';
import DashboardPumpOperatorReadings from './pages/DashboardPumpOperatorReadings.jsx';
import DashboardPumpOperatorSession from './pages/DashboardPumpOperatorSession.jsx';
import LoginPage from './pages/LoginPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

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
      path="/dashboard"
      element={
        <ProtectedRoute allowedRoles={['admin', 'manager', 'pumpOperator']}>
          <DashboardHome />
        </ProtectedRoute>
      }
    />
    <Route
      path="/dashboard/users"
      element={
        <ProtectedRoute allowedRoles={['admin']}>
          <DashboardAdminUsers />
        </ProtectedRoute>
      }
    />
    <Route
      path="/dashboard/analytics"
      element={
        <ProtectedRoute allowedRoles={['admin', 'manager']}>
          <DashboardAnalytics />
        </ProtectedRoute>
      }
    />
    <Route
      path="/dashboard/config/fuel-types"
      element={
        <ProtectedRoute allowedRoles={['admin']}>
          <DashboardAdminFuelTypes />
        </ProtectedRoute>
      }
    />
    <Route
      path="/dashboard/config/tanks"
      element={
        <ProtectedRoute allowedRoles={['admin']}>
          <DashboardAdminTanks />
        </ProtectedRoute>
      }
    />
    <Route
      path="/dashboard/config/nozzles"
      element={
        <ProtectedRoute allowedRoles={['admin']}>
          <DashboardAdminNozzles />
        </ProtectedRoute>
      }
    />
    <Route
      path="/dashboard/config/units"
      element={
        <ProtectedRoute allowedRoles={['admin']}>
          <DashboardAdminUnits />
        </ProtectedRoute>
      }
    />
    <Route
      path="/dashboard/sessions"
      element={
        <ProtectedRoute allowedRoles={['admin']}>
          <DashboardAdminSessions />
        </ProtectedRoute>
      }
    />
    <Route
      path="/dashboard/units"
      element={
        <ProtectedRoute allowedRoles={['manager']}>
          <DashboardManagerUnits />
        </ProtectedRoute>
      }
    />
    <Route
      path="/dashboard/purchases"
      element={
        <ProtectedRoute allowedRoles={['manager']}>
          <DashboardManagerPurchases />
        </ProtectedRoute>
      }
    />
    <Route
      path="/dashboard/session"
      element={
        <ProtectedRoute allowedRoles={['pumpOperator']}>
          <DashboardPumpOperatorSession />
        </ProtectedRoute>
      }
    />
    <Route
      path="/dashboard/readings"
      element={
        <ProtectedRoute allowedRoles={['pumpOperator']}>
          <DashboardPumpOperatorReadings />
        </ProtectedRoute>
      }
    />

    <Route path="/admin" element={<Navigate to="/dashboard" replace />} />
    <Route path="/manager" element={<Navigate to="/dashboard" replace />} />
    <Route path="/pump-operator" element={<Navigate to="/dashboard" replace />} />
    <Route path="*" element={<NotFoundPage />} />
  </Routes>
);

export default App;
