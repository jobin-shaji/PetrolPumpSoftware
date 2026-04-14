import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import AdminOverview from './DashboardAdminOverview.jsx';
import ManagerOverview from './DashboardManagerOverview.jsx';
import PumpOperatorOverview from './DashboardPumpOperatorOverview.jsx';

const DashboardHome = () => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'admin') {
    return <AdminOverview />;
  }

  if (user.role === 'manager') {
    return <ManagerOverview />;
  }

  return <PumpOperatorOverview />;
};

export default DashboardHome;
